<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\ClientsExport;
use App\Exports\Inmopro\ClientsTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ImportClientsConfirmRequest;
use App\Http\Requests\Inmopro\ImportClientsPreviewRequest;
use App\Http\Requests\Inmopro\StoreClientRequest;
use App\Http\Requests\Inmopro\UpdateClientRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Services\Inmopro\ClientsExcelImportService;
use App\Services\Inmopro\ClientsIndexQuery;
use App\Support\InertiaListingRedirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ClientController extends Controller
{
    public function __construct(private ClientsIndexQuery $clientsIndexQuery) {}

    public function search(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        $term = trim((string) $q);
        if ($term === '') {
            return response()->json([]);
        }
        $like = '%'.$term.'%';
        $clients = Client::query()
            ->with(['advisor'])
            ->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                    ->orWhere('dni', 'like', $like);
            })
            ->orderBy('name')
            ->limit(15)
            ->get(['id', 'name', 'dni', 'phone', 'advisor_id']);

        return response()->json($clients);
    }

    public function index(Request $request): Response|RedirectResponse
    {
        if ($this->clientsIndexQuery->shouldRedirectWithDefaultDates($request)) {
            return redirect()->route('inmopro.clients.index', array_merge(
                $request->query(),
                $this->clientsIndexQuery->defaultDateFilters(),
            ));
        }

        $query = Client::query()->with(['type', 'city', 'advisor.team'])->withCount('lots');

        $this->clientsIndexQuery->apply($query, $request);

        $this->clientsIndexQuery->applyDefaultOrdering($query);

        $clients = $query->paginate($this->clientsIndexQuery->perPage($request))->withQueryString();

        return Inertia::render('inmopro/clients/index', [
            'clients' => $clients,
            'filters' => $this->clientsIndexQuery->filtersFromRequest($request),
            'clientTypes' => ClientType::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'cities' => City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'advisors' => Advisor::query()->orderBy('name')->get(['id', 'name']),
            'perPageOptions' => ClientsIndexQuery::PER_PAGE_OPTIONS,
        ]);
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        $clientsQuery = Client::query()->with(['type', 'city', 'advisor']);

        $this->clientsIndexQuery->apply($clientsQuery, $request);

        $this->clientsIndexQuery->applyDefaultOrdering($clientsQuery);

        $clients = $clientsQuery->get();

        return Excel::download(
            new ClientsExport($clients),
            'clientes.xlsx'
        );
    }

    public function excelTemplate(): BinaryFileResponse
    {
        return Excel::download(
            new ClientsTemplateExport,
            'plantilla_clientes.xlsx'
        );
    }

    public function importPreview(ImportClientsPreviewRequest $request, ClientsExcelImportService $importService): JsonResponse
    {
        return response()->json(
            $importService->preview($request->file('file'))
        );
    }

    public function importConfirm(
        ImportClientsConfirmRequest $request,
        ClientsExcelImportService $importService
    ): RedirectResponse {
        try {
            $importService->confirm($request->validated('token'), $request->user());
        } catch (RuntimeException $e) {
            return redirect()
                ->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request))
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request))
            ->with('success', 'Clientes importados correctamente.');
    }

    public function create(): Response
    {
        return Inertia::render('inmopro/clients/create', [
            'clientTypes' => ClientType::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color']),
            'cities' => City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'department']),
            'advisors' => Advisor::query()->with('team')->orderBy('name')->get(['id', 'name', 'team_id']),
        ]);
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        Client::create($request->validated());

        return redirect()->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request));
    }

    public function show(Client $client): Response
    {
        $client->load(['type', 'city', 'advisor.team', 'lots.project', 'lots.status']);

        return Inertia::render('inmopro/clients/show', [
            'client' => $client,
        ]);
    }

    public function edit(Client $client): Response
    {
        return Inertia::render('inmopro/clients/edit', [
            'client' => $client,
            'clientTypes' => ClientType::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color']),
            'cities' => City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'department']),
            'advisors' => Advisor::query()->with('team')->orderBy('name')->get(['id', 'name', 'team_id']),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $client->update($request->validated());

        return redirect()->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request));
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        $client->delete();

        return redirect()
            ->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request))
            ->with('success', 'Cliente eliminado.');
    }
}
