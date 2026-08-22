<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorAgendaEvent;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    public function index(Request $request): Response
    {
        $advisorId = $request->query('advisor_id');
        $advisors = Advisor::orderBy('name')->get(['id', 'name']);
        $clients = [];
        $events = [];
        $remindersPending = [];

        if ($advisorId) {
            $clients = Client::query()
                ->where('advisor_id', $advisorId)
                ->orderBy('name')
                ->get(['id', 'name']);
            $start = $request->query('start') ? Carbon::parse($request->query('start')) : now()->startOfMonth();
            $end = $request->query('end') ? Carbon::parse($request->query('end')) : now()->endOfMonth()->addMonth();

            $events = AdvisorAgendaEvent::query()
                ->with('client:id,name')
                ->where('advisor_id', $advisorId)
                ->whereBetween('starts_at', [$start, $end])
                ->orderBy('starts_at')
                ->get()
                ->map(function (AdvisorAgendaEvent $event): array {
                    $endAt = $event->ends_at ?? $event->starts_at->copy()->addHour();

                    return [
                        'id' => 'event-'.$event->id,
                        'title' => $event->title,
                        'start' => $event->starts_at->toIso8601String(),
                        'end' => $endAt->toIso8601String(),
                        'url' => route('inmopro.agenda.index', ['advisor_id' => $event->advisor_id, 'event_id' => $event->id]),
                        'extendedProps' => [
                            'type' => 'event',
                            'eventId' => $event->id,
                            'client' => $event->client?->name,
                            'client_id' => $event->client_id,
                            'title' => $event->title,
                            'notes' => $event->notes,
                            'starts_at' => $event->starts_at->toIso8601String(),
                            'ends_at' => $event->ends_at?->toIso8601String(),
                        ],
                    ];
                })
                ->values()
                ->all();

            $remindersInRange = AdvisorReminder::query()
                ->with('client:id,name')
                ->where('advisor_id', $advisorId)
                ->pending()
                ->where('remind_at', '<=', now()->endOfDay())
                ->whereBetween('remind_at', [$start, $end])
                ->orderBy('remind_at')
                ->get();

            foreach ($remindersInRange as $reminder) {
                $events[] = [
                    'id' => 'reminder-'.$reminder->id,
                    'title' => '⏰ '.$reminder->title,
                    'start' => $reminder->remind_at->toIso8601String(),
                    'end' => $reminder->remind_at->copy()->addMinutes(15)->toIso8601String(),
                    'extendedProps' => [
                        'type' => 'reminder',
                        'reminderId' => $reminder->id,
                        'client' => $reminder->client?->name,
                        'client_id' => $reminder->client_id,
                        'title' => $reminder->title,
                        'notes' => $reminder->notes,
                        'remind_at' => $reminder->remind_at->toIso8601String(),
                    ],
                ];
            }

            $remindersPending = AdvisorReminder::query()
                ->with('client:id,name')
                ->where('advisor_id', $advisorId)
                ->pending()
                ->where('remind_at', '<=', now()->endOfDay())
                ->orderBy('remind_at')
                ->get();
        }

        return Inertia::render('inmopro/agenda/index', [
            'advisors' => $advisors,
            'clients' => $clients,
            'events' => $events,
            'remindersPending' => $remindersPending,
            'clientStatuses' => ClientStatus::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'clientTags' => ClientTag::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('advisor_id', 'start', 'end'),
        ]);
    }
}
