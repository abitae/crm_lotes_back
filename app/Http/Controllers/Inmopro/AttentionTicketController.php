<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreAttentionTicketRequest;
use App\Http\Requests\Inmopro\UpdateAttentionTicketRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\DeliveryDeed;
use App\Models\Inmopro\Project;
use App\Support\AppBrandingResolver;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttentionTicketController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AttentionTicket::with(['advisor', 'client', 'project', 'lot', 'deliveryDeed'])
            ->orderByRaw('case when scheduled_at is null then 1 else 0 end')
            ->orderByDesc('scheduled_at')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $tickets = $query->paginate(15)->withQueryString();

        return Inertia::render('inmopro/operations/attention-tickets/index', [
            'tickets' => $tickets,
            'filters' => $request->only('status', 'create'),
            'advisors' => Advisor::query()->orderBy('name')->get(['id', 'name']),
            'clients' => Client::query()
                ->with('advisor:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'advisor_id']),
            'projects' => Project::query()->orderBy('name')->get(['id', 'name', 'location']),
        ]);
    }

    public function calendar(Request $request): Response
    {
        $query = AttentionTicket::with(['advisor', 'client', 'project'])
            ->whereNotNull('scheduled_at')
            ->orderBy('scheduled_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $events = $query->get()->map(function (AttentionTicket $ticket): array {
            $start = Carbon::parse($ticket->scheduled_at);
            $end = $start->copy()->addHour();

            return [
                'id' => (string) $ticket->id,
                'title' => sprintf(
                    '#%d · %s · %s',
                    $ticket->id,
                    $ticket->advisor?->name ?? 'Sin vendedor',
                    $ticket->project?->name ?? 'Sin proyecto'
                ),
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
                'url' => route('inmopro.attention-tickets.show', $ticket),
                'extendedProps' => [
                    'status' => $ticket->status,
                    'advisor' => $ticket->advisor?->name,
                    'project' => $ticket->project?->name,
                    'client' => $ticket->client?->name,
                ],
            ];
        })->values()->all();

        return Inertia::render('inmopro/operations/attention-tickets/calendar', [
            'events' => $events,
            'filters' => $request->only('status'),
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.attention-tickets.index', [
            'create' => 1,
        ]);
    }

    public function store(StoreAttentionTicketRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['scheduled_at'] = ! empty($validated['scheduled_at']) ? Carbon::parse($validated['scheduled_at']) : null;
        $validated['status'] = 'pendiente';

        AttentionTicket::create($validated);

        return redirect()->route('inmopro.attention-tickets.index');
    }

    public function show(AttentionTicket $attention_ticket): Response
    {
        $attention_ticket->load(['advisor', 'client', 'project', 'lot.project', 'lot.client', 'deliveryDeed']);

        return Inertia::render('inmopro/operations/attention-tickets/show', [
            'ticket' => $attention_ticket,
        ]);
    }

    public function edit(AttentionTicket $attention_ticket): Response
    {
        $attention_ticket->load(['advisor', 'client', 'project', 'lot.project', 'lot.client']);

        return Inertia::render('inmopro/operations/attention-tickets/edit', [
            'ticket' => $attention_ticket,
        ]);
    }

    public function update(UpdateAttentionTicketRequest $request, AttentionTicket $attention_ticket): RedirectResponse
    {
        $validated = $request->validated();
        $validated['scheduled_at'] = isset($validated['scheduled_at']) && $validated['scheduled_at']
            ? Carbon::parse($validated['scheduled_at'])
            : null;

        $attention_ticket->update($validated);

        return redirect()->route('inmopro.attention-tickets.show', $attention_ticket);
    }

    public function destroy(AttentionTicket $attention_ticket): RedirectResponse
    {
        $attention_ticket->delete();

        return redirect()->route('inmopro.attention-tickets.index');
    }

    public function deliveryDeed(AttentionTicket $attention_ticket): Response
    {
        abort_if(! $attention_ticket->lot_id, 422, 'El ticket no tiene lote asociado para generar acta.');

        $attention_ticket->load(['lot.project', 'lot.client', 'advisor']);

        $deed = $attention_ticket->deliveryDeed;
        if (! $deed) {
            $deed = DeliveryDeed::create([
                'attention_ticket_id' => $attention_ticket->id,
                'lot_id' => $attention_ticket->lot_id,
                'printed_at' => now(),
            ]);
        } elseif (! $deed->printed_at) {
            $deed->update(['printed_at' => now()]);
        }

        return Inertia::render('inmopro/operations/delivery-deed-print', [
            'ticket' => $attention_ticket->load(['lot.project', 'lot.client', 'advisor']),
            'deed' => $deed,
            'companyName' => AppBrandingResolver::resolvedDisplayName(),
        ]);
    }

    public function markDeedSigned(AttentionTicket $attention_ticket): RedirectResponse
    {
        abort_if(! $attention_ticket->lot_id, 422, 'El ticket no tiene lote asociado para registrar acta.');

        $deed = $attention_ticket->deliveryDeed;
        if (! $deed) {
            $deed = DeliveryDeed::create([
                'attention_ticket_id' => $attention_ticket->id,
                'lot_id' => $attention_ticket->lot_id,
                'printed_at' => null,
                'signed_at' => now(),
            ]);
        } else {
            $deed->update(['signed_at' => now()]);
        }

        $attention_ticket->update(['status' => 'realizado']);

        return back();
    }
}
