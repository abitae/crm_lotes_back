<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\IndexClientRequest;
use App\Http\Requests\Crm\StoreClientRequest;
use App\Http\Requests\Crm\UpdateClientRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function index(IndexClientRequest $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $clients = $this->advisorVisibleClientsQuery($advisor)
            ->with(['type:id,code,name', 'status:id,code,name,color', 'tags:id,code,name,color'])
            ->when($request->filled('client_type'), function (Builder $query) use ($request): void {
                $code = (string) $request->input('client_type');
                $query->where('client_type_id', ClientType::query()->where('code', $code)->value('id'));
            })
            ->when($request->filled('client_status_id'), function (Builder $query) use ($request): void {
                $query->where('client_status_id', $request->integer('client_status_id'));
            })
            ->when($request->filled('tag_id'), function (Builder $query) use ($request): void {
                $tagId = $request->integer('tag_id');
                $query->whereHas('tags', fn (Builder $tagQuery) => $tagQuery->where('client_tags.id', $tagId));
            })
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $this->applySearch($query, (string) $request->input('search'));
            })
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('crm/clients/index', [
            'clients' => $clients,
            'statuses' => ClientStatus::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'color']),
            'tags' => ClientTag::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'color']),
            'filters' => $request->only(['search', 'client_type', 'client_status_id', 'tag_id']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('crm/clients/create', [
            'cities' => City::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'department']),
        ]);
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $ownClientTypeId = ClientType::query()->where('code', 'PROPIO')->value('id');

        $client = Client::create([
            ...$request->validated(),
            'advisor_id' => $advisor->id,
            'client_type_id' => $ownClientTypeId,
        ]);

        $this->clientCrmService->logEvent($client, 'client.created', ClientCrmService::SOURCE_CRM, $advisor);

        return redirect()->route('crm.clients.show', $client)->with('success', 'Cliente registrado.');
    }

    public function show(Request $request, Client $client): Response
    {
        $ownedClient = $this->ownedClientOr404($request, $client);
        $ownedClient->load(['city', 'lots.project', 'lots.status', 'status', 'tags']);

        return Inertia::render('crm/clients/show', [
            'client' => $ownedClient,
        ]);
    }

    public function edit(Request $request, Client $client): Response
    {
        $ownedClient = $this->ownedClientOr404($request, $client);

        return Inertia::render('crm/clients/edit', [
            'client' => $ownedClient,
            'cities' => City::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'department']),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $ownedClient = $this->ownedClientOr404($request, $client);
        $ownedClient->update($request->validated());

        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $this->clientCrmService->logEvent($ownedClient, 'client.edited', ClientCrmService::SOURCE_CRM, $advisor);

        return redirect()->route('crm.clients.show', $ownedClient)->with('success', 'Cliente actualizado.');
    }

    /**
     * Clientes visibles para el vendedor en el CRM: PROPIO (propios) y DATERO (captados por sus dateros).
     * El alta desde el CRM solo crea tipo PROPIO (método store).
     *
     * @return Builder<Client>
     */
    private function advisorVisibleClientsQuery(Advisor $advisor): Builder
    {
        return Client::query()
            ->where('advisor_id', $advisor->id)
            ->whereIn('client_type_id', ClientType::query()->whereIn('code', ['PROPIO', 'DATERO'])->select('id'));
    }

    /**
     * @param  Builder<Client>  $query
     */
    private function applySearch(Builder $query, string $term): void
    {
        $trimmedTerm = trim($term);
        $numericTerm = preg_replace('/\D+/', '', $trimmedTerm) ?? '';
        $isNumericSearch = $numericTerm !== '' && preg_match('/[a-záéíóúñ]/iu', $trimmedTerm) !== 1;

        $query->where(function (Builder $nestedQuery) use ($isNumericSearch, $numericTerm, $trimmedTerm): void {
            if ($isNumericSearch) {
                $nestedQuery->where('phone_normalized', 'like', $numericTerm.'%')
                    ->orWhere('dni_normalized', 'like', $numericTerm.'%');

                return;
            }

            $nestedQuery->where('name', 'like', '%'.$trimmedTerm.'%');
        });
    }

    private function ownedClientOr404(Request $request, Client $client): Client
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return $this->advisorVisibleClientsQuery($advisor)
            ->whereKey($client->id)
            ->firstOrFail();
    }
}
