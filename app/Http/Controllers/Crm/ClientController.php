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
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Services\Crm\CrmClientsIndexQuery;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
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
        $kanbanMeta = null;

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

            $kanbanTotal = (clone $query)->count();
            $kanbanCounts = (clone $query)
                ->reorder()
                ->selectRaw('COALESCE(client_status_id, 0) as status_key, COUNT(*) as aggregate')
                ->groupByRaw('COALESCE(client_status_id, 0)')
                ->pluck('aggregate', 'status_key')
                ->mapWithKeys(fn ($count, $key): array => [(int) $key => (int) $count]);

            $this->clientsIndexQuery->applyDefaultOrdering($query);

            $kanbanClients = $query
                ->with(['type:id,code,name', 'status:id,code,name,color', 'tags:id,code,name,color'])
                ->limit(self::KANBAN_MAX_CLIENTS)
                ->get(self::CLIENT_ROW_COLUMNS);

            $kanbanMeta = [
                'shown' => $kanbanClients->count(),
                'total' => $kanbanTotal,
                'limit' => self::KANBAN_MAX_CLIENTS,
                'counts' => (object) $kanbanCounts->all(),
            ];
        }

        return Inertia::render('crm/clients/index', [
            'clients' => $clients,
            'kanbanClients' => $kanbanClients,
            'kanbanMeta' => $kanbanMeta,
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

    public function search(Request $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }

        $query = $this->advisorVisibleClientsQuery($advisor);
        $this->clientsIndexQuery->applySearchTerm($query, $term);

        $clients = $query
            ->orderBy('name')
            ->orderBy('id')
            ->limit(20)
            ->get(['id', 'name', 'dni', 'phone']);

        return response()->json($clients);
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
        $ownedClient->load(['type', 'city', 'lots.project', 'lots.status', 'status', 'tags']);

        return Inertia::render('crm/clients/show', [
            'client' => [
                'id' => $ownedClient->id,
                'name' => $ownedClient->name,
                'dni' => $ownedClient->dni,
                'phone' => $ownedClient->phone,
                'email' => $ownedClient->email,
                'referred_by' => $ownedClient->referred_by,
                'created_at' => $ownedClient->created_at?->toIso8601String(),
                'type' => $ownedClient->type ? [
                    'code' => $ownedClient->type->code,
                    'name' => $ownedClient->type->name,
                ] : null,
                'status' => $ownedClient->status ? [
                    'id' => $ownedClient->status->id,
                    'code' => $ownedClient->status->code,
                    'name' => $ownedClient->status->name,
                    'color' => $ownedClient->status->color,
                ] : null,
                'tags' => $ownedClient->tags
                    ->map(fn (ClientTag $tag): array => [
                        'id' => $tag->id,
                        'name' => $tag->name,
                        'color' => $tag->color,
                    ])
                    ->values()
                    ->all(),
                'city' => $ownedClient->city ? [
                    'id' => $ownedClient->city->id,
                    'name' => $ownedClient->city->name,
                    'department' => $ownedClient->city->department,
                ] : null,
                'lots' => $ownedClient->lots
                    ->map(fn (Lot $lot): array => [
                        'id' => $lot->id,
                        'block' => $lot->block,
                        'number' => $lot->number,
                        'area' => $lot->area,
                        'price' => $lot->price,
                        'project' => $lot->project ? [
                            'id' => $lot->project->id,
                            'name' => $lot->project->name,
                        ] : null,
                        'status' => $lot->status ? [
                            'code' => $lot->status->code,
                            'name' => $lot->status->name,
                            'color' => $lot->status->color,
                        ] : null,
                    ])
                    ->values()
                    ->all(),
            ],
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
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'ticketTypes' => AttentionTicketType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
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
