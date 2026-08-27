<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\CancelAttentionTicketRequest;
use App\Http\Requests\Crm\StoreAttentionTicketRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AttentionTicketController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $tickets = AttentionTicket::query()
            ->with(['client:id,name,dni', 'project:id,name', 'type:id,name,code,color'])
            ->where('advisor_id', $advisor->id)
            ->orderByRaw('case when scheduled_at is null then 1 else 0 end')
            ->orderByDesc('scheduled_at')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('crm/attention-tickets/index', [
            'tickets' => $tickets,
            'clients' => Client::query()
                ->where('advisor_id', $advisor->id)
                ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
                ->orderBy('name')
                ->get(['id', 'name', 'dni']),
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'ticketTypes' => AttentionTicketType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function create(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return Inertia::render('crm/attention-tickets/create', [
            'clients' => Client::query()
                ->where('advisor_id', $advisor->id)
                ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
                ->orderBy('name')
                ->get(['id', 'name', 'dni']),
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'ticketTypes' => AttentionTicketType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function store(StoreAttentionTicketRequest $request): RedirectResponse
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

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $request->integer('project_id'),
            'attention_ticket_type_id' => $request->integer('attention_ticket_type_id'),
            'status' => 'pendiente',
            'notes' => $request->input('notes'),
            'scheduled_at' => null,
        ]);

        $this->clientCrmService->logEvent(
            $client,
            'ticket.created',
            ClientCrmService::SOURCE_CRM,
            $advisor,
            meta: ['ticket_id' => $ticket->id],
        );

        return redirect()->route('crm.attention-tickets.index')->with('success', 'Ticket de atención registrado.');
    }

    public function cancel(CancelAttentionTicketRequest $request, AttentionTicket $attentionTicket): RedirectResponse
    {
        $ticket = $this->ownedTicketOr404($request, $attentionTicket);

        if (in_array($ticket->status, ['realizado', 'cancelado'], true)) {
            throw ValidationException::withMessages(['status' => 'El ticket ya no puede cancelarse.']);
        }

        $notes = $ticket->notes;
        $cancelNotes = $request->input('notes');

        if ($cancelNotes) {
            $notes = trim(implode("\n\n", array_filter([
                $notes,
                'Cancelado desde CRM: '.$cancelNotes,
            ])));
        }

        $ticket->update(['status' => 'cancelado', 'notes' => $notes]);

        if ($ticket->client) {
            /** @var Advisor $advisor */
            $advisor = $request->user('advisor');
            $this->clientCrmService->logEvent(
                $ticket->client,
                'ticket.cancelled',
                ClientCrmService::SOURCE_CRM,
                $advisor,
                meta: ['ticket_id' => $ticket->id],
            );
        }

        return redirect()->route('crm.attention-tickets.index')->with('success', 'Ticket cancelado correctamente.');
    }

    private function ownedTicketOr404(Request $request, AttentionTicket $attentionTicket): AttentionTicket
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return AttentionTicket::query()
            ->with(['client', 'project', 'type'])
            ->whereKey($attentionTicket->id)
            ->where('advisor_id', $advisor->id)
            ->firstOrFail();
    }
}
