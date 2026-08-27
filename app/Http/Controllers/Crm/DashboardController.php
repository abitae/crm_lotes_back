<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $advisorId = $advisor->id;

        $visibleClients = Client::query()
            ->where('advisor_id', $advisorId)
            ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']));

        $clientsCount = (clone $visibleClients)->count();
        $propioClientsCount = (clone $visibleClients)
            ->whereHas('type', fn ($query) => $query->where('code', 'PROPIO'))
            ->count();
        $dateroClientsCount = (clone $visibleClients)
            ->whereHas('type', fn ($query) => $query->where('code', 'DATERO'))
            ->count();

        $preReservationPending = LotPreReservation::query()
            ->where('advisor_id', $advisorId)
            ->where('status', 'PENDIENTE')
            ->count();

        $preReservationApproved = LotPreReservation::query()
            ->where('advisor_id', $advisorId)
            ->where('status', 'APROBADA')
            ->count();

        $preReservationRejected = LotPreReservation::query()
            ->where('advisor_id', $advisorId)
            ->where('status', 'RECHAZADA')
            ->count();

        $preReservationActive = $preReservationPending + $preReservationApproved;

        $lotStatusCounts = $this->lotStatusCountsForAdvisor($advisorId);

        $attentionTicketsPending = AttentionTicket::query()
            ->where('advisor_id', $advisorId)
            ->where('status', 'pendiente')
            ->count();

        $remindersPending = AdvisorReminder::query()
            ->where('advisor_id', $advisorId)
            ->whereHas('client', fn ($clientQuery) => $clientQuery->whereHas('type', fn ($typeQuery) => $typeQuery->whereIn('code', ['PROPIO', 'DATERO'])))
            ->pending()
            ->count();

        $clientsByStatus = ClientStatus::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'color'])
            ->map(function (ClientStatus $status) use ($advisorId): array {
                $count = Client::query()
                    ->where('advisor_id', $advisorId)
                    ->where('client_status_id', $status->id)
                    ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
                    ->count();

                return [
                    'id' => $status->id,
                    'code' => $status->code,
                    'name' => $status->name,
                    'color' => $status->color,
                    'count' => $count,
                ];
            })
            ->all();

        return Inertia::render('crm/dashboard/index', [
            'kpis' => [
                'clients' => [
                    'total' => $clientsCount,
                    'propio' => $propioClientsCount,
                    'datero' => $dateroClientsCount,
                ],
                'clients_by_status' => $clientsByStatus,
                'pre_reservations' => [
                    'active' => $preReservationActive,
                    'pending' => $preReservationPending,
                    'approved' => $preReservationApproved,
                    'rejected' => $preReservationRejected,
                ],
                'lots' => [
                    'pre_reservation' => $lotStatusCounts->get(LotStatus::CODE_PRERESERVA, 0),
                    'reserved' => $lotStatusCounts->get(LotStatus::CODE_RESERVADO, 0),
                    'transferred' => $lotStatusCounts->get(LotStatus::CODE_TRANSFERIDO, 0),
                    'installments' => $lotStatusCounts->get(LotStatus::CODE_CUOTAS, 0),
                ],
                'attention_tickets_pending' => $attentionTicketsPending,
                'reminders_pending' => $remindersPending,
            ],
        ]);
    }

    /**
     * @return Collection<string, int>
     */
    private function lotStatusCountsForAdvisor(int $advisorId): Collection
    {
        return Lot::query()
            ->where('lots.advisor_id', $advisorId)
            ->join('lot_statuses', 'lots.lot_status_id', '=', 'lot_statuses.id')
            ->groupBy('lot_statuses.code')
            ->selectRaw('lot_statuses.code as status_code, COUNT(*) as aggregate')
            ->pluck('aggregate', 'status_code')
            ->map(fn ($count) => (int) $count);
    }
}
