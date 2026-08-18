<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\IndexClientRequest;
use App\Http\Requests\Api\v1\Cazador\StoreClientRequest;
use App\Http\Requests\Api\v1\Cazador\UpdateClientRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(IndexClientRequest $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $clients = $this->advisorVisibleClientsQuery($advisor)
            ->select(['id', 'name', 'dni', 'phone', 'client_type_id'])
            ->with('type:id,code,name')
            ->when($request->filled('client_type'), function (Builder $query) use ($request): void {
                $code = (string) $request->input('client_type');
                $query->where('client_type_id', ClientType::query()->where('code', $code)->value('id'));
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

        return response()->json([
            'message' => 'Cliente registrado.',
            'data' => $this->clientPayload($client->fresh('city')),
        ], 201);
    }

    public function show(Request $request, Client $client): JsonResponse
    {
        $ownedClient = $this->ownedClient($request, $client);
        if ($ownedClient === null) {
            return response()->json(['message' => 'Cliente no encontrado.'], 404);
        }

        $ownedClient->load(['city', 'lots.project', 'lots.status']);

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

        return response()->json([
            'message' => 'Cliente actualizado.',
            'data' => $this->clientPayload($ownedClient->fresh('city')),
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
        $client->loadMissing('type');

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
}
