<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    /**
     * The calendar is a fixed-window view (FullCalendar renders a static
     * `events` array, it doesn't fetch on navigation), so instead of loading
     * every reminder an advisor has ever created, only a window covering
     * recent history plus a full year ahead is queried.
     */
    private const PAST_MONTHS = 3;

    private const FUTURE_MONTHS = 12;

    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $reminders = AdvisorReminder::query()
            ->with('client:id,name')
            ->where('advisor_id', $advisor->id)
            ->visibleForAdvisor()
            ->whereBetween('remind_at', [
                now()->subMonths(self::PAST_MONTHS)->startOfDay(),
                now()->addMonths(self::FUTURE_MONTHS)->endOfDay(),
            ])
            ->orderBy('remind_at')
            ->get();

        $events = $reminders->map(function (AdvisorReminder $reminder): array {
            $isCompleted = $reminder->completed_at !== null;
            $isGoogle = $reminder->source === 'google' && $reminder->client_id === null;

            return [
                'id' => (string) $reminder->id,
                'title' => ($isCompleted ? '✓ ' : ($isGoogle ? '📅 ' : '⏰ ')).$reminder->title,
                'start' => $reminder->remind_at->toIso8601String(),
                'end' => $reminder->remind_at->copy()->addMinutes(30)->toIso8601String(),
                'backgroundColor' => $isCompleted ? '#94a3b8' : ($isGoogle ? '#8b5cf6' : '#0ea5e9'),
                'borderColor' => $isCompleted ? '#94a3b8' : ($isGoogle ? '#8b5cf6' : '#0ea5e9'),
                'extendedProps' => [
                    'reminderId' => $reminder->id,
                    'clientId' => $reminder->client_id,
                    'client' => $reminder->client?->name,
                    'title' => $reminder->title,
                    'notes' => $reminder->notes,
                    'remindAt' => $reminder->remind_at->toIso8601String(),
                    'completed' => $isCompleted,
                    'source' => $reminder->source,
                ],
            ];
        })->values()->all();

        return Inertia::render('crm/agenda/index', [
            'events' => $events,
            'clients' => Client::query()
                ->where('advisor_id', $advisor->id)
                ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }
}
