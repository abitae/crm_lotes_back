<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\IndexClientRequest;
use App\Http\Requests\Api\v1\Cazador\StoreClientCrmEventRequest;
use App\Http\Requests\Api\v1\Cazador\StoreClientRequest;
use App\Http\Requests\Api\v1\Cazador\UpdateClientCrmRequest;
use App\Http\Requests\Api\v1\Cazador\UpdateClientRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function index(IndexClientRequest $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $clients = $this->advisorVisibleClientsQuery($advisor)
            ->select(['id', 'name', 'dni', 'phone', 'client_type_id', 'client_status_id', 'registered_by_datero_id'])
            ->with([
                'type:id,code,name',
                'status:id,code,name,color',
                'tags:id,code,name,color',
                'registeredByDatero:id,name',
            ])
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
            ->cursorPaginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => $clients->getCollection()->map(fn (Client $client) => $this->clientListPayload($client))->all(),
            'meta' => [
                'next_cursor' => $clients->nextCursor()?->encode(),
                'has_more' => $clients->hasMorePages(),
                'per_page' => $clients->perPage(),
            ],
        ]);
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $ownClientTypeId = ClientType::query()->where('code', 'PROPIO')->value('id');

        $client = Client::create([
            ...$request->validated(),
            'advisor_id' => $advisor->id,
            'client_type_id' => $ownClientTypeId,
        ]);

        $this->clientCrmService->logEvent(
            $client,
            'client.created',
            ClientCrmService::SOURCE_CAZADOR,
            $advisor,
        );

        return response()->json([
            'message' => 'Cliente registrado.',
            'data' => $this->clientPayload($client->fresh(['city', 'status', 'tags'])),
        ], 201);
    }

    public function show(Request $request, Client $client): JsonResponse
    {
        $ownedClient = $this->ownedClient($request, $client);
        if ($ownedClient === null) {
            return response()->json(['message' => 'Cliente no encontrado.'], 404);
        }

        $ownedClient->load(['city', 'lots.project', 'lots.status', 'status', 'tags']);

        return response()->json([
            'data' => $this->clientPayload($ownedClient, true),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $ownedClient = $this->ownedClient($request, $client);
        if ($ownedClient === null) {
            return response()->json(['message' => 'Cliente no encontrado.'], 404);
        }

        $ownedClient->update($request->validated());

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $this->clientCrmService->logEvent(
            $ownedClient,
            'client.edited',
            ClientCrmService::SOURCE_CAZADOR,
            $advisor,
        );

        return response()->json([
            'message' => 'Cliente actualizado.',
            'data' => $this->clientPayload($ownedClient->fresh(['city', 'status', 'tags'])),
        ]);
    }

    public function storeCrmEvent(StoreClientCrmEventRequest $request, Client $client): JsonResponse
    {
        $ownedClient = $this->ownedClient($request, $client);
        if ($ownedClient === null) {
            return response()->json(['message' => 'Cliente no encontrado.'], 404);
        }

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $validated = $request->validated();
        /** @var array<string, mixed>|null $meta */
        $meta = $validated['meta'] ?? null;

        $event = $this->clientCrmService->logEvent(
            $ownedClient,
            (string) $validated['action'],
            ClientCrmService::SOURCE_CAZADOR,
            $advisor,
            meta: $meta,
        );

        return response()->json([
            'message' => 'Evento CRM registrado.',
            'data' => [
                'id' => $event->id,
                'action' => $event->action,
                'label' => $event->label,
                'created_at' => $event->created_at?->toAtomString(),
            ],
        ], 201);
    }

    public function updateCrm(UpdateClientCrmRequest $request, Client $client): JsonResponse
    {
        $ownedClient = $this->ownedClient($request, $client);
        if ($ownedClient === null) {
            return response()->json(['message' => 'Cliente no encontrado.'], 404);
        }

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $validated = $request->validated();

        if (! array_key_exists('client_status_id', $validated) && ! array_key_exists('tag_ids', $validated)) {
            return response()->json([
                'message' => 'Debe enviar estado de seguimiento y/o etiquetas.',
            ], 422);
        }

        $updated = $this->clientCrmService->applyCrmFields(
            $ownedClient,
            array_key_exists('client_status_id', $validated)
                ? ($validated['client_status_id'] !== null ? (int) $validated['client_status_id'] : null)
                : null,
            array_key_exists('tag_ids', $validated)
                ? array_values(array_map('intval', $validated['tag_ids'] ?? []))
                : null,
            $advisor,
            allowNullStatus: array_key_exists('client_status_id', $validated) && $validated['client_status_id'] === null,
        );

        return response()->json([
            'message' => 'Seguimiento del cliente actualizado.',
            'data' => $this->clientPayload($updated),
        ]);
    }

    /**
     * Clientes visibles para el asesor en el API Cazador: PROPIO (propios) y DATERO (captados por sus dateros).
     * El alta desde este API solo crea tipo PROPIO (método store).
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

    /**
     * @return array<string, mixed>
     */
    private function clientListPayload(Client $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'dni' => $client->dni,
            'phone' => $client->phone,
            'client_type' => $client->type ? [
                'code' => $client->type->code,
                'name' => $client->type->name,
            ] : null,
            'status' => $this->statusPayload($client),
            'tags' => $this->tagsPayload($client),
            'registered_by_datero' => $client->registeredByDatero ? [
                'id' => $client->registeredByDatero->id,
                'name' => $client->registeredByDatero->name,
            ] : null,
        ];
    }

    private function ownedClient(Request $request, Client $client): ?Client
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        return $this->advisorVisibleClientsQuery($advisor)
            ->whereKey($client->id)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function clientPayload(Client $client, bool $includeLots = false): array
    {
        $client->loadMissing(['type', 'status', 'tags', 'registeredByDatero:id,name']);

        return [
            'id' => $client->id,
            'name' => $client->name,
            'dni' => $client->dni,
            'phone' => $client->phone,
            'email' => $client->email,
            'referred_by' => $client->referred_by,
            'city_id' => $client->city_id,
            'client_type' => $client->type ? [
                'code' => $client->type->code,
                'name' => $client->type->name,
            ] : null,
            'status' => $this->statusPayload($client),
            'tags' => $this->tagsPayload($client),
            'registered_by_datero' => $client->registeredByDatero ? [
                'id' => $client->registeredByDatero->id,
                'name' => $client->registeredByDatero->name,
            ] : null,
            'city' => $client->city ? [
                'id' => $client->city->id,
                'name' => $client->city->name,
                'department' => $client->city->department,
            ] : null,
            'lots' => $includeLots
                ? $client->lots->map(fn ($lot) => [
                    'id' => $lot->id,
                    'block' => $lot->block,
                    'number' => $lot->number,
                    'project' => $lot->project?->name,
                    'status' => $lot->status?->code,
                ])->all()
                : [],
        ];
    }

    /**
     * @return array{id: int, code: string, name: string, color: ?string}|null
     */
    private function statusPayload(Client $client): ?array
    {
        if (! $client->status) {
            return null;
        }

        return [
            'id' => $client->status->id,
            'code' => $client->status->code,
            'name' => $client->status->name,
            'color' => $client->status->color,
        ];
    }

    /**
     * @return list<array{id: int, code: string, name: string, color: ?string}>
     */
    private function tagsPayload(Client $client): array
    {
        return $client->tags
            ->map(fn (ClientTag $tag): array => [
                'id' => $tag->id,
                'code' => $tag->code,
                'name' => $tag->name,
                'color' => $tag->color,
            ])
            ->values()
            ->all();
    }
}
