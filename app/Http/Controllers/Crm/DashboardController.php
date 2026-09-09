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
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;
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
            ->visibleForAdvisor()
            ->pending()
            ->count();

        $clientCountsByStatus = $this->clientCountsByStatusForAdvisor($advisorId);
        $unassignedClientsCount = (clone $visibleClients)->whereNull('client_status_id')->count();

        $metaConnected = $advisor->metaConnection?->isActive() ?? false;
        $metaStats = null;

        if ($metaConnected) {
            $metaStats = [
                'conversations_open' => MetaConversation::query()
                    ->where('advisor_id', $advisorId)
                    ->whereIn('status', [MetaConversation::STATUS_OPEN, MetaConversation::STATUS_HUMAN, MetaConversation::STATUS_BOT])
                    ->count(),
                'messages_inbound_today' => MetaMessage::query()
                    ->whereHas('conversation', fn ($q) => $q->where('advisor_id', $advisorId))
                    ->where('direction', MetaMessage::DIRECTION_INBOUND)
                    ->whereDate('created_at', today())
                    ->count(),
                'messages_outbound_today' => MetaMessage::query()
                    ->whereHas('conversation', fn ($q) => $q->where('advisor_id', $advisorId))
                    ->where('direction', MetaMessage::DIRECTION_OUTBOUND)
                    ->whereDate('created_at', today())
                    ->count(),
            ];
        }

        $clientsByStatus = ClientStatus::query()
            ->forAdvisor($advisorId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'color'])
            ->map(fn (ClientStatus $status): array => [
                'id' => $status->id,
                'code' => $status->code,
                'name' => $status->name,
                'color' => $status->color,
                'count' => $clientCountsByStatus->get($status->id, 0),
            ])
            ->values();

        if ($unassignedClientsCount > 0) {
            $clientsByStatus->prepend([
                'id' => 0,
                'code' => 'SIN_ESTADO',
                'name' => 'Sin estado',
                'color' => '#94a3b8',
                'count' => $unassignedClientsCount,
            ]);
        }

        return Inertia::render('crm/dashboard/index', [
            'kpis' => [
                'clients' => [
                    'total' => $clientsCount,
                    'propio' => $propioClientsCount,
                    'datero' => $dateroClientsCount,
                ],
                'clients_by_status' => $clientsByStatus->all(),
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
                'meta' => $metaStats,
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

    /**
     * One grouped query instead of one COUNT() per client status.
     *
     * @return Collection<int, int>
     */
    private function clientCountsByStatusForAdvisor(int $advisorId): Collection
    {
        return Client::query()
            ->where('advisor_id', $advisorId)
            ->whereNotNull('client_status_id')
            ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
            ->groupBy('client_status_id')
            ->selectRaw('client_status_id, COUNT(*) as aggregate')
            ->pluck('aggregate', 'client_status_id')
            ->map(fn ($count) => (int) $count);
    }
}
