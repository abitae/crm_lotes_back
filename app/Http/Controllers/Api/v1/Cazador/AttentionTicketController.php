<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\CancelAttentionTicketRequest;
use App\Http\Requests\Api\v1\Cazador\StoreAttentionTicketRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\Client;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttentionTicketController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}
    public function index(Request $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $tickets = AttentionTicket::query()
            ->with(['client', 'project', 'type'])
            ->where('advisor_id', $advisor->id)
            ->orderByRaw('case when scheduled_at is null then 1 else 0 end')
            ->orderByDesc('scheduled_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $tickets->map(fn (AttentionTicket $ticket): array => $this->ticketPayload($ticket))->all(),
        ]);
    }

    public function store(StoreAttentionTicketRequest $request): JsonResponse
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

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $request->integer('project_id'),
            'attention_ticket_type_id' => $request->integer('attention_ticket_type_id'),
            'status' => 'pendiente',
            'notes' => $request->input('notes'),
            'scheduled_at' => null,
        ])->load(['client', 'project', 'type']);

        $this->clientCrmService->logEvent(
            $client,
            'ticket.created',
            ClientCrmService::SOURCE_CAZADOR,
            $advisor,
            meta: ['ticket_id' => $ticket->id],
        );

        return response()->json([
            'message' => 'Ticket de atención registrado.',
            'data' => $this->ticketPayload($ticket),
        ], 201);
    }

    public function cancel(CancelAttentionTicketRequest $request, AttentionTicket $attentionTicket): JsonResponse
    {
        $ticket = $this->ownedTicket($request, $attentionTicket);

        if (! $ticket) {
            return response()->json(['message' => 'Ticket no encontrado.'], 404);
        }

        if (in_array($ticket->status, ['realizado', 'cancelado'], true)) {
            return response()->json([
                'message' => 'El ticket ya no puede cancelarse.',
            ], 422);
        }

        $notes = $ticket->notes;
        $cancelNotes = $request->input('notes');

        if ($cancelNotes) {
            $notes = trim(implode("\n\n", array_filter([
                $notes,
                'Cancelado desde Cazador: '.$cancelNotes,
            ])));
        }

        $ticket->update([
            'status' => 'cancelado',
            'notes' => $notes,
        ]);

        if ($ticket->client) {
            /** @var Advisor $advisor */
            $advisor = $request->attributes->get('advisor');
            $this->clientCrmService->logEvent(
                $ticket->client,
                'ticket.cancelled',
                ClientCrmService::SOURCE_CAZADOR,
                $advisor,
                meta: ['ticket_id' => $ticket->id],
            );
        }

        return response()->json([
            'message' => 'Ticket cancelado correctamente.',
            'data' => $this->ticketPayload($ticket->fresh(['client', 'project', 'type'])),
        ]);
    }

    private function ownedTicket(Request $request, AttentionTicket $attentionTicket): ?AttentionTicket
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        return AttentionTicket::query()
            ->with(['client', 'project', 'type'])
            ->whereKey($attentionTicket->id)
            ->where('advisor_id', $advisor->id)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function ticketPayload(AttentionTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'status' => $ticket->status,
            'scheduled_at' => $ticket->scheduled_at?->toAtomString(),
            'notes' => $ticket->notes,
            'created_at' => $ticket->created_at?->toAtomString(),
            'client' => $ticket->client ? [
                'id' => $ticket->client->id,
                'name' => $ticket->client->name,
                'dni' => $ticket->client->dni,
            ] : null,
            'project' => $ticket->project ? [
                'id' => $ticket->project->id,
                'name' => $ticket->project->name,
                'location' => $ticket->project->location,
            ] : null,
            'type' => $ticket->type ? [
                'id' => $ticket->type->id,
                'name' => $ticket->type->name,
                'code' => $ticket->type->code,
                'color' => $ticket->type->color,
                'allows_overlap' => $ticket->type->allows_overlap,
            ] : null,
        ];
    }
}
