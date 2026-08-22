<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\StorePreReservationRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Services\Inmopro\ClientCrmService;
use App\Support\FileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PreReservationController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}
    public function store(StorePreReservationRequest $request, Lot $lot): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $client = Client::query()
            ->whereKey($request->integer('client_id'))
            ->where('advisor_id', $advisor->id)
            ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
            ->first();

        if (! $client) {
            return response()->json([
                'message' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.',
            ], 422);
        }

        $lot->loadMissing(['status', 'project']);

        if ($request->integer('lot_id') !== $lot->id) {
            return response()->json([
                'message' => 'El lote enviado no coincide con la ruta.',
            ], 422);
        }

        if ((int) $lot->project_id !== $request->integer('project_id')) {
            return response()->json([
                'message' => 'El lote no pertenece al proyecto enviado.',
            ], 422);
        }

        if ($lot->status?->code !== 'LIBRE') {
            return response()->json([
                'message' => 'La unidad no está disponible para pre-reserva.',
            ], 422);
        }

        $hasActiveRequest = LotPreReservation::query()
            ->where('lot_id', $lot->id)
            ->whereIn('status', ['PENDIENTE', 'APROBADA'])
            ->exists();

        if ($hasActiveRequest) {
            return response()->json([
                'message' => 'La unidad ya tiene una pre-reserva activa.',
            ], 422);
        }

        $preReservationStatusId = LotStatus::query()->where('code', 'PRERESERVA')->value('id');

        if (! $preReservationStatusId) {
            return response()->json([
                'message' => 'No existe el estado de pre-reserva configurado.',
            ], 500);
        }

        $preReservation = DB::transaction(function () use ($advisor, $client, $lot, $request, $preReservationStatusId) {
            $storedPath = FileStorage::storeUploadedFile(
                $request->file('voucher_image'),
                'pre-reservations/cazador',
            );

            try {
                $preReservation = LotPreReservation::create([
                    'lot_id' => $lot->id,
                    'client_id' => $client->id,
                    'advisor_id' => $advisor->id,
                    'status' => 'PENDIENTE',
                    'amount' => $request->input('amount'),
                    'voucher_path' => $storedPath,
                    'payment_reference' => $request->input('payment_reference'),
                    'notes' => $request->input('notes'),
                ]);

                $lot->update([
                    'lot_status_id' => $preReservationStatusId,
                    'client_id' => $client->id,
                    'advisor_id' => $advisor->id,
                    'client_name' => $client->name,
                    'client_dni' => $client->dni,
                ]);

                return $preReservation;
            } catch (\Throwable $e) {
                FileStorage::deleteIfExists($storedPath);

                throw $e;
            }
        });

        $this->clientCrmService->logEvent(
            $client,
            'pre_reservation.created',
            ClientCrmService::SOURCE_CAZADOR,
            $advisor,
            meta: [
                'pre_reservation_id' => $preReservation->id,
                'lot_id' => $lot->id,
                'project_id' => $lot->project_id,
            ],
        );

        return response()->json([
            'message' => 'Pre-reserva registrada y pendiente de aprobación.',
            'data' => [
                'id' => $preReservation->id,
                'status' => $preReservation->status,
                'amount' => $preReservation->amount,
                'project' => [
                    'id' => $lot->project?->id,
                    'name' => $lot->project?->name,
                ],
                'lot' => [
                    'id' => $lot->id,
                    'block' => $lot->block,
                    'number' => $lot->number,
                ],
                'voucher_url' => FileStorage::sensitiveUrl($preReservation->voucher_path),
            ],
        ], 201);
    }
}
