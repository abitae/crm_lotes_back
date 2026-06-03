<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ApproveLotPreReservationRequest;
use App\Http\Requests\Inmopro\RejectLotPreReservationRequest;
use App\Http\Requests\Inmopro\StoreLotPreReservationRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Support\FileStorage;
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
        $lotIds = collect($request->input('lot_ids', []))
            ->map(fn (mixed $lotId): int => (int) $lotId)
            ->values();

        $lots = Lot::query()
            ->with(['status', 'project'])
            ->whereKey($lotIds)
            ->get();

        if ($lots->count() !== $lotIds->count()) {
            return back()->withErrors([
                'lot_ids' => 'Uno o mas lotes seleccionados no existen.',
            ]);
        }

        if ($lots->contains(fn (Lot $lot): bool => ! $lot->project?->is_active)) {
            return back()->withErrors([
                'lot_ids' => 'Todos los lotes deben pertenecer a proyectos activos.',
            ]);
        }

        $client = null;

        if ($request->filled('client_id')) {
            $client = Client::query()
                ->with('type')
                ->find($request->integer('client_id'));
        }

        if ($client !== null && ((int) $client->advisor_id !== $request->integer('advisor_id') || $client->type?->code !== 'PROPIO')) {
            return back()->withErrors([
                'client_id' => 'El cliente debe ser PROPIO y pertenecer al asesor seleccionado.',
            ]);
        }

        $ownClientTypeId = ClientType::query()->where('code', 'PROPIO')->value('id');

        if ($client === null && ! $ownClientTypeId) {
            return back()->withErrors([
                'client_id' => 'No existe el tipo de cliente PROPIO configurado.',
            ]);
        }

        $preReservationStatusId = LotStatus::query()->where('code', LotStatus::CODE_PRERESERVA)->value('id');

        if (! $preReservationStatusId) {
            return back()->withErrors([
                'lot_ids' => 'No existe el estado de pre-reserva configurado.',
            ]);
        }

        $storedPath = FileStorage::storeUploadedFile(
            $request->file('voucher_image'),
            'inmopro/lot-pre-reservations',
        );
        $amounts = $this->distributedAmounts((float) $request->input('amount'), $lotIds->count());

        $error = DB::transaction(function () use ($amounts, $client, $lotIds, $ownClientTypeId, $preReservationStatusId, $request, $storedPath): ?string {
            $lockedLots = Lot::query()
                ->with(['status', 'project'])
                ->whereKey($lotIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($lotIds as $lotId) {
                /** @var Lot|null $lot */
                $lot = $lockedLots->get($lotId);

                if ($lot === null || ! $this->canRegisterPreReservation($lot)) {
                    return 'La unidad debe estar libre y sin una pre-reserva activa.';
                }
            }

            $preReservationClient = $client ?? $this->createPreReservationClient($request, (int) $ownClientTypeId);

            foreach ($lotIds as $index => $lotId) {
                /** @var Lot $lot */
                $lot = $lockedLots->get($lotId);

                LotPreReservation::create([
                    'lot_id' => $lot->id,
                    'client_id' => $preReservationClient->id,
                    'advisor_id' => $request->integer('advisor_id'),
                    'status' => 'PENDIENTE',
                    'amount' => $amounts[$index],
                    'voucher_path' => $storedPath,
                    'payment_reference' => $request->input('payment_reference'),
                    'notes' => $request->input('notes'),
                ]);

                $lot->update([
                    'lot_status_id' => $preReservationStatusId,
                    'client_id' => $preReservationClient->id,
                    'advisor_id' => $request->integer('advisor_id'),
                    'client_name' => $preReservationClient->name,
                    'client_dni' => $preReservationClient->dni,
                ]);
            }

            return null;
        });

        if ($error !== null) {
            return back()->withErrors([
                'lot_ids' => $error,
            ]);
        }

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

    private function createPreReservationClient(StoreLotPreReservationRequest $request, int $ownClientTypeId): Client
    {
        /** @var array{name: string, dni: string, phone: string} $newClient */
        $newClient = $request->input('new_client', []);

        return Client::create([
            'name' => trim((string) $newClient['name']),
            'dni' => trim((string) $newClient['dni']),
            'phone' => trim((string) $newClient['phone']),
            'client_type_id' => $ownClientTypeId,
            'advisor_id' => $request->integer('advisor_id'),
        ])->load('type');
    }

    /**
     * @return list<string>
     */
    private function distributedAmounts(float $totalAmount, int $count): array
    {
        $totalCents = (int) round($totalAmount * 100);
        $baseCents = intdiv($totalCents, $count);
        $remainderCents = $totalCents - ($baseCents * $count);

        return collect(range(1, $count))
            ->map(fn (int $position): string => number_format(
                ($baseCents + ($position === $count ? $remainderCents : 0)) / 100,
                2,
                '.',
                ''
            ))
            ->all();
    }
}
