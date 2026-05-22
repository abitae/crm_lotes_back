<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ApproveLotPreReservationRequest;
use App\Http\Requests\Inmopro\RejectLotPreReservationRequest;
use App\Http\Requests\Inmopro\StoreLotPreReservationRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LotPreReservationController extends Controller
{
    public function index(Request $request): Response
    {
        $preReservations = LotPreReservation::query()
            ->with(['lot.project', 'lot.status', 'client.city', 'advisor.team', 'reviewer'])
            ->whereHas('lot.project', fn ($projectQuery) => $projectQuery->active())
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('project_id'), function ($query) use ($request) {
                $query->whereHas('lot', fn ($lotQuery) => $lotQuery
                    ->where('project_id', $request->integer('project_id'))
                    ->whereHas('project', fn ($projectQuery) => $projectQuery->active()));
            })
            ->when($request->filled('advisor_id'), fn ($query) => $query->where('advisor_id', $request->integer('advisor_id')))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('inmopro/lot-pre-reservations/index', [
            'preReservations' => $preReservations,
            'filters' => $request->only('status', 'project_id', 'advisor_id'),
            'projects' => Project::query()->active()->orderBy('name')->get(['id', 'name']),
            'advisors' => Advisor::query()->with('team')->orderBy('name')->get(['id', 'name', 'team_id']),
            'availableLots' => Lot::query()
                ->with(['project', 'status'])
                ->whereHas('project', fn ($projectQuery) => $projectQuery->active())
                ->whereHas('status', fn ($query) => $query->where('code', LotStatus::CODE_LIBRE))
                ->orderBy('project_id')
                ->orderBy('block')
                ->orderBy('number')
                ->get(['id', 'project_id', 'block', 'number', 'lot_status_id']),
            'clients' => Client::query()
                ->with(['advisor:id,name', 'city:id,name'])
                ->whereHas('type', fn ($query) => $query->where('code', 'PROPIO'))
                ->orderBy('name')
                ->get(['id', 'name', 'dni', 'phone', 'advisor_id', 'city_id']),
        ]);
    }

    public function store(StoreLotPreReservationRequest $request): RedirectResponse
    {
        $lot = Lot::query()
            ->with(['status', 'project'])
            ->findOrFail($request->integer('lot_id'));

        $client = Client::query()
            ->with('advisor')
            ->findOrFail($request->integer('client_id'));

        if ((int) $lot->project_id !== $request->integer('project_id')) {
            return back()->withErrors([
                'lot_id' => 'El lote no pertenece al proyecto seleccionado.',
            ]);
        }

        if (! $lot->project?->is_active) {
            return back()->withErrors([
                'project_id' => 'El proyecto seleccionado no está activo.',
            ]);
        }

        if ((int) $client->advisor_id !== $request->integer('advisor_id')) {
            return back()->withErrors([
                'client_id' => 'El cliente no pertenece al asesor seleccionado.',
            ]);
        }

        if (! $this->canRegisterPreReservation($lot)) {
            return back()->withErrors([
                'lot_id' => 'La unidad debe estar libre y sin una pre-reserva activa.',
            ]);
        }

        $preReservationStatusId = LotStatus::query()->where('code', LotStatus::CODE_PRERESERVA)->value('id');

        if (! $preReservationStatusId) {
            return back()->withErrors([
                'lot_id' => 'No existe el estado de pre-reserva configurado.',
            ]);
        }

        $storedPath = $request->file('voucher_image')->store('inmopro/lot-pre-reservations', 'public');

        DB::transaction(function () use ($client, $lot, $preReservationStatusId, $request, $storedPath) {
            LotPreReservation::create([
                'lot_id' => $lot->id,
                'client_id' => $client->id,
                'advisor_id' => $request->integer('advisor_id'),
                'status' => 'PENDIENTE',
                'amount' => $request->input('amount'),
                'voucher_path' => $storedPath,
                'payment_reference' => $request->input('payment_reference'),
                'notes' => $request->input('notes'),
            ]);

            $lot->update([
                'lot_status_id' => $preReservationStatusId,
                'client_id' => $client->id,
                'advisor_id' => $request->integer('advisor_id'),
                'client_name' => $client->name,
                'client_dni' => $client->dni,
            ]);
        });

        return redirect()->route('inmopro.lot-pre-reservations.index');
    }

    public function approve(ApproveLotPreReservationRequest $request, LotPreReservation $lot_pre_reservation): RedirectResponse
    {
        $reservedStatusId = LotStatus::query()->where('code', 'RESERVADO')->value('id');

        DB::transaction(function () use ($lot_pre_reservation, $request, $reservedStatusId) {
            $lot_pre_reservation->update([
                'status' => 'APROBADA',
                'notes' => $request->string('review_notes')->toString(),
                'reviewed_by' => $request->user()?->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ]);

            $lot_pre_reservation->lot()->update([
                'lot_status_id' => $reservedStatusId,
                'client_id' => $lot_pre_reservation->client_id,
                'advisor_id' => $lot_pre_reservation->advisor_id,
                'client_name' => $lot_pre_reservation->client?->name,
                'client_dni' => $lot_pre_reservation->client?->dni,
            ]);
        });

        return redirect()->route('inmopro.lot-pre-reservations.index');
    }

    public function reject(RejectLotPreReservationRequest $request, LotPreReservation $lot_pre_reservation): RedirectResponse
    {
        $freeStatusId = LotStatus::query()->where('code', 'LIBRE')->value('id');

        DB::transaction(function () use ($lot_pre_reservation, $request, $freeStatusId) {
            $lot_pre_reservation->update([
                'status' => 'RECHAZADA',
                'reviewed_by' => $request->user()?->id,
                'reviewed_at' => now(),
                'rejection_reason' => $request->input('rejection_reason'),
            ]);

            $lot_pre_reservation->lot()->update([
                'lot_status_id' => $freeStatusId,
                'client_id' => null,
                'client_name' => null,
                'client_dni' => null,
                'advisor_id' => null,
            ]);
        });

        return redirect()->route('inmopro.lot-pre-reservations.index');
    }

    private function canRegisterPreReservation(Lot $lot): bool
    {
        if ($lot->status?->code !== LotStatus::CODE_LIBRE) {
            return false;
        }

        return ! LotPreReservation::query()
            ->where('lot_id', $lot->id)
            ->whereIn('status', ['PENDIENTE', 'APROBADA'])
            ->exists();
    }
}
