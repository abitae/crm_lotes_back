<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreAttentionTicketRequest;
use App\Http\Requests\Inmopro\UpdateAttentionTicketRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\DeliveryDeed;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\AttentionTicketScheduleValidator;
use App\Support\AppBrandingResolver;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttentionTicketController extends Controller
{
    public function __construct(private readonly AttentionTicketScheduleValidator $scheduleValidator) {}

    public function index(Request $request): Response
    {
        $query = AttentionTicket::with(['advisor', 'client', 'project', 'lot', 'deliveryDeed', 'type'])
            ->orderByRaw('case when scheduled_at is null then 1 else 0 end')
            ->orderByDesc('scheduled_at')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('advisor_id')) {
            $query->where('advisor_id', $request->integer('advisor_id'));
        }

        $tickets = $query->paginate(15)->withQueryString();

        return Inertia::render('inmopro/operations/attention-tickets/index', [
            'tickets' => $tickets,
            'filters' => $request->only('status', 'create', 'project_id', 'advisor_id'),
            'advisors' => Advisor::query()->orderBy('name')->get(['id', 'name']),
            'clients' => Client::query()
                ->with('advisor:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'advisor_id']),
            'projects' => Project::query()->active()->orderBy('name')->get(['id', 'name', 'location']),
            'ticketTypes' => AttentionTicketType::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'color', 'allows_overlap']),
        ]);
    }

    public function calendar(Request $request): Response
    {
        $types = AttentionTicketType::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'color', 'allows_overlap']);

        $selectedTypeId = $request->integer('type_id') ?: $types->first()?->id;

        $query = AttentionTicket::with(['advisor', 'client', 'project', 'type'])
            ->whereNotNull('scheduled_at')
            ->orderBy('scheduled_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($selectedTypeId) {
            $query->where('attention_ticket_type_id', $selectedTypeId);
        }

        $events = $query->get()->map(function (AttentionTicket $ticket): array {
            $start = Carbon::parse($ticket->scheduled_at);
            $end = $start->copy()->addHour();
            $color = $ticket->type?->color ?? '#64748b';

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
                'backgroundColor' => $color,
                'borderColor' => $color,
                'extendedProps' => [
                    'status' => $ticket->status,
                    'advisor' => $ticket->advisor?->name,
                    'project' => $ticket->project?->name,
                    'client' => $ticket->client?->name,
                    'type' => $ticket->type?->name,
                ],
            ];
        })->values()->all();

        return Inertia::render('inmopro/operations/attention-tickets/calendar', [
            'events' => $events,
            'ticketTypes' => $types,
            'filters' => [
                ...$request->only('status'),
                'type_id' => $selectedTypeId ? (string) $selectedTypeId : null,
            ],
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

        if ($validated['scheduled_at']) {
            $this->scheduleValidator->ensureCanSchedule(
                (int) $validated['attention_ticket_type_id'],
                $validated['scheduled_at'],
            );
        }

        AttentionTicket::create($validated);

        return redirect()->route('inmopro.attention-tickets.index');
    }

    public function show(AttentionTicket $attention_ticket): Response
    {
        $attention_ticket->load(['advisor', 'client', 'project', 'lot.project', 'lot.client', 'deliveryDeed', 'type']);

        return Inertia::render('inmopro/operations/attention-tickets/show', [
            'ticket' => $attention_ticket,
        ]);
    }

    public function edit(AttentionTicket $attention_ticket): Response
    {
        $attention_ticket->load(['advisor', 'client', 'project', 'lot.project', 'lot.client', 'type']);

        return Inertia::render('inmopro/operations/attention-tickets/edit', [
            'ticket' => $attention_ticket,
            'ticketTypes' => AttentionTicketType::query()
                ->where('is_active', true)
                ->orWhereKey($attention_ticket->attention_ticket_type_id)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'color', 'allows_overlap']),
        ]);
    }

    public function update(UpdateAttentionTicketRequest $request, AttentionTicket $attention_ticket): RedirectResponse
    {
        $validated = $request->validated();
        $validated['scheduled_at'] = isset($validated['scheduled_at']) && $validated['scheduled_at']
            ? Carbon::parse($validated['scheduled_at'])
            : null;
        $typeId = (int) ($validated['attention_ticket_type_id'] ?? $attention_ticket->attention_ticket_type_id);

        if ($validated['scheduled_at']) {
            $this->scheduleValidator->ensureCanSchedule($typeId, $validated['scheduled_at'], $attention_ticket->id);
        }

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
