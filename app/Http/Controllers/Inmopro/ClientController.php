<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\ClientsExport;
use App\Exports\Inmopro\ClientsTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ImportClientsConfirmRequest;
use App\Http\Requests\Inmopro\ImportClientsPreviewRequest;
use App\Http\Requests\Inmopro\MergeClientsByDniRequest;
use App\Http\Requests\Inmopro\MergeClientsByPhoneRequest;
use App\Http\Requests\Inmopro\StoreClientRequest;
use App\Http\Requests\Inmopro\UpdateClientCrmRequest;
use App\Http\Requests\Inmopro\UpdateClientRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Models\User;
use App\Services\Inmopro\ClientCrmService;
use App\Services\Inmopro\ClientDuplicateMergeService;
use App\Services\Inmopro\ClientsExcelImportService;
use App\Services\Inmopro\ClientsIndexQuery;
use App\Support\InertiaListingRedirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ClientController extends Controller
{
    public function __construct(
        private ClientsIndexQuery $clientsIndexQuery,
        private ClientCrmService $clientCrmService,
        private ClientDuplicateMergeService $clientDuplicateMergeService,
    ) {}

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

    public function phoneDuplicates(): JsonResponse
    {
        return response()->json([
            'groups' => $this->clientDuplicateMergeService->duplicateGroups(ClientDuplicateMergeService::FIELD_PHONE),
        ]);
    }

    public function dniDuplicates(): JsonResponse
    {
        return response()->json([
            'groups' => $this->clientDuplicateMergeService->duplicateGroups(ClientDuplicateMergeService::FIELD_DNI),
        ]);
    }

    public function mergeByPhone(MergeClientsByPhoneRequest $request): RedirectResponse
    {
        return $this->mergeDuplicates(
            $request,
            (int) $request->validated('keep_client_id'),
            array_values(array_map('intval', $request->validated('merge_client_ids'))),
            ClientDuplicateMergeService::FIELD_PHONE,
        );
    }

    public function mergeByDni(MergeClientsByDniRequest $request): RedirectResponse
    {
        return $this->mergeDuplicates(
            $request,
            (int) $request->validated('keep_client_id'),
            array_values(array_map('intval', $request->validated('merge_client_ids'))),
            ClientDuplicateMergeService::FIELD_DNI,
        );
    }

    /**
     * @param  list<int>  $mergeClientIds
     */
    private function mergeDuplicates(
        Request $request,
        int $keepClientId,
        array $mergeClientIds,
        string $field,
    ): RedirectResponse {
        try {
            $keep = $this->clientDuplicateMergeService->merge($keepClientId, $mergeClientIds, $field);
        } catch (InvalidArgumentException $e) {
            return redirect()
                ->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request))
                ->with('error', $e->getMessage());
        }

        $mergedCount = count($mergeClientIds);

        return redirect()
            ->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request))
            ->with(
                'success',
                $mergedCount === 1
                    ? 'Cliente unificado correctamente en «'.$keep->name.'».'
                    : $mergedCount.' clientes unificados correctamente en «'.$keep->name.'».'
            );
    }

    public function index(Request $request): Response|RedirectResponse
    {
        if ($this->clientsIndexQuery->shouldRedirectWithDefaultDates($request)) {
            return redirect()->route('inmopro.clients.index', array_merge(
                $request->query(),
                $this->clientsIndexQuery->defaultDateFilters(),
            ));
        }

        $query = Client::query()->with(['type', 'status', 'tags', 'city', 'advisor.team'])->withCount('lots');

        $this->clientsIndexQuery->apply($query, $request);

        $this->clientsIndexQuery->applyDefaultOrdering($query);

        $clients = $query->paginate($this->clientsIndexQuery->perPage($request))->withQueryString();

        $clientForModal = null;
        if ($request->filled('modal') && $request->input('modal') === 'edit_client' && $request->filled('client_id')) {
            $clientForModal = Client::query()
                ->with(['tags:id'])
                ->find($request->integer('client_id'));
        }

        return Inertia::render('inmopro/clients/index', [
            'clients' => $clients,
            'filters' => $this->clientsIndexQuery->filtersFromRequest($request),
            'clientTypes' => ClientType::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'clientStatuses' => ClientStatus::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'advisor_id', 'name', 'color']),
            'clientTags' => ClientTag::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'advisor_id', 'name', 'color']),
            'cities' => City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'department']),
            'advisors' => Advisor::query()->with('team')->orderBy('name')->get(['id', 'name', 'team_id']),
            'perPageOptions' => ClientsIndexQuery::PER_PAGE_OPTIONS,
            'clientForModal' => $clientForModal,
            'openModal' => $request->input('modal'),
        ]);
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        $this->clientsIndexQuery->mergeDefaultDatesIfMissing($request);

        $clientsQuery = Client::query()->with(['type', 'status', 'tags', 'city', 'advisor.team'])->withCount('lots');

        $this->clientsIndexQuery->apply($clientsQuery, $request);

        $this->clientsIndexQuery->applyDefaultOrdering($clientsQuery);

        $clients = $clientsQuery->get();

        return Excel::download(
            new ClientsExport($clients),
            'clientes_vista.xlsx'
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
        try {
            if (function_exists('set_time_limit')) {
                set_time_limit(180);
            }

            return response()->json(
                $importService->preview($request->file('file'))
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'No se pudo validar el archivo. Si es muy grande, intente de nuevo.',
            ], 500);
        }
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
            'clientStatuses' => ClientStatus::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'advisor_id', 'name', 'color']),
            'clientTags' => ClientTag::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'advisor_id', 'name', 'color']),
            'cities' => City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'department']),
            'advisors' => Advisor::query()->with('team')->orderBy('name')->get(['id', 'name', 'team_id']),
        ]);
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $tagIds = array_values(array_map('intval', $validated['tag_ids'] ?? []));
        $statusId = array_key_exists('client_status_id', $validated)
            ? ($validated['client_status_id'] !== null ? (int) $validated['client_status_id'] : null)
            : null;
        unset($validated['tag_ids'], $validated['client_status_id']);

        $client = Client::create($validated);

        $this->clientCrmService->applyCrmFields(
            $client,
            $statusId,
            $tagIds,
            $client->advisor,
            allowNullStatus: $statusId === null,
        );

        return redirect()->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request));
    }

    public function show(Client $client): Response
    {
        $client->load([
            'type',
            'status',
            'tags',
            'city',
            'advisor.team',
            'lots.project',
            'lots.status',
            'reminders' => fn ($query) => $query->pending()->orderBy('remind_at')->limit(10),
            'crmEvents' => fn ($query) => $query->with('advisor')->limit(50),
        ]);

        $advisorId = (int) $client->advisor_id;

        return Inertia::render('inmopro/clients/show', [
            'client' => $client,
            'clientStatuses' => ClientStatus::query()
                ->forAdvisor($advisorId)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'advisor_id', 'name', 'color']),
            'clientTags' => ClientTag::query()
                ->forAdvisor($advisorId)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'advisor_id', 'name', 'color']),
        ]);
    }

    public function edit(Request $request, Client $client): RedirectResponse
    {
        return redirect()->route('inmopro.clients.index', array_merge(
            InertiaListingRedirect::clientsIndexQuery($request),
            [
                'modal' => 'edit_client',
                'client_id' => $client->id,
            ],
        ));
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $validated = $request->validated();
        $tagIds = array_values(array_map('intval', $validated['tag_ids'] ?? []));
        $statusId = array_key_exists('client_status_id', $validated)
            ? ($validated['client_status_id'] !== null ? (int) $validated['client_status_id'] : null)
            : $client->client_status_id;
        unset($validated['tag_ids'], $validated['client_status_id']);

        $client->update($validated);

        /** @var User|null $user */
        $user = $request->user();

        $this->clientCrmService->applyCrmFields(
            $client,
            $statusId,
            $tagIds,
            $client->advisor,
            allowNullStatus: true,
            source: ClientCrmService::SOURCE_INMOPRO,
            user: $user,
        );

        $this->clientCrmService->logEvent(
            $client,
            'client.edited',
            ClientCrmService::SOURCE_INMOPRO,
            $client->advisor,
            $user,
        );

        return redirect()->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request));
    }

    public function updateCrm(UpdateClientCrmRequest $request, Client $client): RedirectResponse
    {
        $validated = $request->validated();
        /** @var User|null $user */
        $user = $request->user();

        $this->clientCrmService->applyCrmFields(
            $client,
            array_key_exists('client_status_id', $validated)
                ? ($validated['client_status_id'] !== null ? (int) $validated['client_status_id'] : null)
                : null,
            array_key_exists('tag_ids', $validated)
                ? array_values(array_map('intval', $validated['tag_ids'] ?? []))
                : null,
            $client->advisor,
            allowNullStatus: array_key_exists('client_status_id', $validated),
            source: ClientCrmService::SOURCE_INMOPRO,
            user: $user,
        );

        return redirect()
            ->route('inmopro.clients.show', $client)
            ->with('success', 'Seguimiento CRM actualizado.');
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        $client->delete();

        return redirect()
            ->route('inmopro.clients.index', InertiaListingRedirect::clientsIndexQuery($request))
            ->with('success', 'Cliente eliminado.');
    }
}
