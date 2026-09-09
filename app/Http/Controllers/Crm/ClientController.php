<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\IndexClientRequest;
use App\Http\Requests\Crm\StoreClientRequest;
use App\Http\Requests\Crm\UpdateClientCrmRequest;
use App\Http\Requests\Crm\UpdateClientRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Project;
use App\Services\Crm\CrmClientsIndexQuery;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        private ClientCrmService $clientCrmService,
        private CrmClientsIndexQuery $clientsIndexQuery,
    ) {}

    private const CLIENT_ROW_COLUMNS = [
        'id', 'name', 'dni', 'phone', 'email', 'referred_by',
        'client_type_id', 'client_status_id', 'city_id',
    ];

    /**
     * Upper bound on how many clients the kanban board will render at once.
     * The board fundamentally needs an unpaginated result set to group by
     * status, but this keeps that set bounded instead of growing forever
     * with an advisor's tenure.
     */
    private const KANBAN_MAX_CLIENTS = 300;

    public function index(IndexClientRequest $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $view = $request->string('view')->value() === 'table' ? 'table' : 'kanban';

        // Only the dataset the active view actually renders is fetched — a table
        // load no longer also runs the full kanban query (and vice versa).
        $clients = ['data' => [], 'links' => []];
        $kanbanClients = null;

        if ($view === 'table') {
            $query = $this->advisorVisibleClientsQuery($advisor);
            $this->clientsIndexQuery->apply($query, $request);
            $this->clientsIndexQuery->applyDefaultOrdering($query);

            $clients = $query
                ->with(['type:id,code,name', 'status:id,code,name,color', 'tags:id,code,name,color'])
                ->paginate($this->clientsIndexQuery->perPage($request), self::CLIENT_ROW_COLUMNS)
                ->withQueryString();
        } else {
            $query = $this->advisorVisibleClientsQuery($advisor);
            $this->clientsIndexQuery->apply($query, $request);
            $this->clientsIndexQuery->applyDefaultOrdering($query);

            $kanbanClients = $query
                ->with(['type:id,code,name', 'status:id,code,name,color', 'tags:id,code,name,color'])
                ->limit(self::KANBAN_MAX_CLIENTS)
                ->get(self::CLIENT_ROW_COLUMNS);
        }

        return Inertia::render('crm/clients/index', [
            'clients' => $clients,
            'kanbanClients' => $kanbanClients,
            'view' => $view,
            'statuses' => ClientStatus::query()
                ->forAdvisor($advisor->id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'color']),
            'tags' => ClientTag::query()
                ->forAdvisor($advisor->id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'color']),
            'cities' => City::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'department']),
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'ticketTypes' => AttentionTicketType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'perPageOptions' => CrmClientsIndexQuery::PER_PAGE_OPTIONS,
            'filters' => $this->clientsIndexQuery->filtersFromRequest($request),
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

        return redirect()->route('crm.clients.index')->with('success', 'Cliente registrado.');
    }

    public function show(Request $request, Client $client): Response
    {
        $ownedClient = $this->ownedClientOr404($request, $client);
        $ownedClient->load(['city', 'lots.project', 'lots.status', 'status', 'tags']);

        return Inertia::render('crm/clients/show', [
            'client' => $ownedClient,
            'statuses' => ClientStatus::query()
                ->forAdvisor($ownedClient->advisor_id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'color']),
            'tags' => ClientTag::query()
                ->forAdvisor($ownedClient->advisor_id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'color']),
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

        return redirect()->route('crm.clients.index')->with('success', 'Cliente actualizado.');
    }

    public function updateCrm(UpdateClientCrmRequest $request, Client $client): RedirectResponse
    {
        $ownedClient = $this->ownedClientOr404($request, $client);

        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $this->clientCrmService->applyCrmFields(
            $ownedClient,
            $request->has('client_status_id') ? $request->integer('client_status_id') : null,
            $request->has('tag_ids') ? array_values(array_map('intval', $request->input('tag_ids', []))) : null,
            $advisor,
            source: ClientCrmService::SOURCE_CRM,
        );

        return back();
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        $ownedClient = $this->ownedClientOr404($request, $client);
        $ownedClient->delete();

        return redirect()->route('crm.clients.index')->with('success', 'Cliente eliminado.');
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

    private function ownedClientOr404(Request $request, Client $client): Client
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return $this->advisorVisibleClientsQuery($advisor)
            ->whereKey($client->id)
            ->firstOrFail();
    }
}
