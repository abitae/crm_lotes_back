<?php

namespace App\Http\Controllers\Api\v1\Datero;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Datero\IndexClientRequest;
use App\Http\Requests\Api\v1\Datero\StoreClientRequest;
use App\Http\Requests\Api\v1\Datero\UpdateClientRequest;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Datero;
use App\Services\Inmopro\RegisterClientForDateroAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(IndexClientRequest $request): JsonResponse
    {
        /** @var Datero $datero */
        $datero = $request->attributes->get('datero');

        $clients = Client::query()
            ->select(['id', 'name', 'dni', 'phone'])
            ->where('registered_by_datero_id', $datero->id)
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $term = trim((string) $request->input('search'));
                $numericTerm = preg_replace('/\D+/', '', $term) ?? '';
                $isNumericSearch = $numericTerm !== '' && preg_match('/[a-záéíóúñ]/iu', $term) !== 1;

                $query->where(function (Builder $nestedQuery) use ($isNumericSearch, $numericTerm, $term): void {
                    if ($isNumericSearch) {
                        $nestedQuery->where('phone_normalized', 'like', $numericTerm.'%')
                            ->orWhere('dni_normalized', 'like', $numericTerm.'%');

                        return;
                    }

                    $nestedQuery->where('name', 'like', '%'.$term.'%');
                });
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

    public function store(StoreClientRequest $request, RegisterClientForDateroAction $registerClient): JsonResponse
    {
        /** @var Datero $datero */
        $datero = $request->attributes->get('datero');

        $client = $registerClient->execute($datero, $request->validated());

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

    private function ownedClient(Request $request, Client $client): ?Client
    {
        /** @var Datero $datero */
        $datero = $request->attributes->get('datero');

        return Client::query()
            ->whereKey($client->id)
            ->where('registered_by_datero_id', $datero->id)
            ->first();
    }

    /**
     * @return array<string, int|string|null>
     */
    private function clientListPayload(Client $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'dni' => $client->dni,
            'phone' => $client->phone,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function clientPayload(Client $client, bool $includeLots = false): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'dni' => $client->dni,
            'phone' => $client->phone,
            'email' => $client->email,
            'referred_by' => $client->referred_by,
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
