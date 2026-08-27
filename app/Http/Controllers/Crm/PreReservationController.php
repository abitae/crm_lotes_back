<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StorePreReservationRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Services\Inmopro\ClientCrmService;
use App\Support\FileStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PreReservationController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $preReservations = LotPreReservation::query()
            ->where('advisor_id', $advisor->id)
            ->with(['lot.project', 'client:id,name'])
            ->latest()
            ->paginate(20);

        return Inertia::render('crm/pre-reservations/index', [
            'preReservations' => $preReservations,
        ]);
    }

    public function create(Request $request, Lot $lot): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $lot->load(['project', 'status']);

        abort_unless($lot->project?->is_active, 404);
        abort_unless($lot->status?->code === 'LIBRE', 422, 'La unidad no está disponible para pre-reserva.');

        $clients = Client::query()
            ->where('advisor_id', $advisor->id)
            ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
            ->orderBy('name')
            ->get(['id', 'name', 'dni']);

        return Inertia::render('crm/pre-reservations/create', [
            'lot' => [
                'id' => $lot->id,
                'block' => $lot->block,
                'number' => $lot->number,
                'price' => $lot->price,
                'project' => ['id' => $lot->project->id, 'name' => $lot->project->name],
            ],
            'clients' => $clients,
        ]);
    }

    public function store(StorePreReservationRequest $request, Lot $lot): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $client = Client::query()
            ->whereKey($request->integer('client_id'))
            ->where('advisor_id', $advisor->id)
            ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
            ->first();

        if (! $client) {
            throw ValidationException::withMessages([
                'client_id' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.',
            ]);
        }

        $lot->loadMissing(['status', 'project']);

        if ($request->integer('lot_id') !== $lot->id) {
            throw ValidationException::withMessages(['lot_id' => 'El lote enviado no coincide con la ruta.']);
        }

        if ((int) $lot->project_id !== $request->integer('project_id')) {
            throw ValidationException::withMessages(['project_id' => 'El lote no pertenece al proyecto enviado.']);
        }

        if ($lot->status?->code !== 'LIBRE') {
            throw ValidationException::withMessages(['lot_id' => 'La unidad no está disponible para pre-reserva.']);
        }

        $hasActiveRequest = LotPreReservation::query()
            ->where('lot_id', $lot->id)
            ->whereIn('status', ['PENDIENTE', 'APROBADA'])
            ->exists();

        if ($hasActiveRequest) {
            throw ValidationException::withMessages(['lot_id' => 'La unidad ya tiene una pre-reserva activa.']);
        }

        $preReservationStatusId = LotStatus::query()->where('code', 'PRERESERVA')->value('id');

        abort_unless($preReservationStatusId, 500, 'No existe el estado de pre-reserva configurado.');

        $preReservation = DB::transaction(function () use ($advisor, $client, $lot, $request, $preReservationStatusId) {
            $storedPath = FileStorage::storeUploadedFile(
                $request->file('voucher_image'),
                'pre-reservations/crm',
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
            } catch (Throwable $e) {
                FileStorage::deleteIfExists($storedPath);

                throw $e;
            }
        });

        $this->clientCrmService->logEvent(
            $client,
            'pre_reservation.created',
            ClientCrmService::SOURCE_CRM,
            $advisor,
            meta: [
                'pre_reservation_id' => $preReservation->id,
                'lot_id' => $lot->id,
                'project_id' => $lot->project_id,
            ],
        );

        return redirect()->route('crm.lots.show', $lot)->with('success', 'Pre-reserva registrada y pendiente de aprobación.');
    }
}
