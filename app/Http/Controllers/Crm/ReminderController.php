<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreReminderRequest;
use App\Http\Requests\Crm\UpdateReminderRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReminderController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $reminders = AdvisorReminder::query()
            ->with('client:id,name,phone')
            ->where('advisor_id', $advisor->id)
            ->visibleForAdvisor()
            ->orderByRaw('completed_at is not null')
            ->orderBy('remind_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('crm/reminders/index', [
            'reminders' => $reminders,
            'clients' => Client::query()
                ->where('advisor_id', $advisor->id)
                ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(StoreReminderRequest $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $client = $this->ownedOperationalClient($advisor, $request->integer('client_id'));

        if (! $client) {
            throw ValidationException::withMessages([
                'client_id' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.',
            ]);
        }

        $reminder = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => $request->input('title'),
            'notes' => $request->input('notes'),
            'remind_at' => $request->input('remind_at'),
        ]);

        $this->clientCrmService->logEvent(
            $client,
            'reminder.created',
            ClientCrmService::SOURCE_CRM,
            $advisor,
            meta: ['reminder_id' => $reminder->id, 'title' => $reminder->title],
        );

        return redirect()->route('crm.reminders.index')->with('success', 'Recordatorio creado.');
    }

    public function update(UpdateReminderRequest $request, AdvisorReminder $reminder): RedirectResponse
    {
        $owned = $this->ownedReminderOr404($request, $reminder);

        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $clientId = $request->input('client_id');
        $client = $clientId ? $this->ownedOperationalClient($advisor, (int) $clientId) : null;

        if ($clientId && ! $client) {
            throw ValidationException::withMessages([
                'client_id' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.',
            ]);
        }

        $owned->update([
            'client_id' => $client?->id,
            'title' => $request->input('title'),
            'notes' => $request->input('notes'),
            'remind_at' => $request->input('remind_at'),
        ]);

        if ($client) {
            $this->clientCrmService->logEvent(
                $client,
                'reminder.updated',
                ClientCrmService::SOURCE_CRM,
                $advisor,
                meta: ['reminder_id' => $owned->id, 'title' => $owned->title],
            );
        }

        return redirect()->route('crm.reminders.index')->with('success', 'Recordatorio actualizado.');
    }

    public function destroy(Request $request, AdvisorReminder $reminder): RedirectResponse
    {
        $owned = $this->ownedReminderOr404($request, $reminder);

        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $client = $owned->client;
        $title = $owned->title;
        $reminderId = $owned->id;

        $owned->delete();

        if ($client) {
            $this->clientCrmService->logEvent(
                $client,
                'reminder.deleted',
                ClientCrmService::SOURCE_CRM,
                $advisor,
                meta: ['reminder_id' => $reminderId, 'title' => $title],
            );
        }

        return redirect()->route('crm.reminders.index')->with('success', 'Recordatorio eliminado.');
    }

    public function complete(Request $request, AdvisorReminder $reminder): RedirectResponse
    {
        $owned = $this->ownedReminderOr404($request, $reminder);
        $owned->update(['completed_at' => now()]);

        if ($owned->client) {
            /** @var Advisor $advisor */
            $advisor = $request->user('advisor');
            $this->clientCrmService->logEvent(
                $owned->client,
                'reminder.completed',
                ClientCrmService::SOURCE_CRM,
                $advisor,
                meta: ['reminder_id' => $owned->id, 'title' => $owned->title],
            );
        }

        return redirect()->route('crm.reminders.index')->with('success', 'Recordatorio marcado como realizado.');
    }

    private function ownedReminderOr404(Request $request, AdvisorReminder $reminder): AdvisorReminder
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return AdvisorReminder::query()
            ->with('client:id,name,phone')
            ->whereKey($reminder->id)
            ->where('advisor_id', $advisor->id)
            ->visibleForAdvisor()
            ->firstOrFail();
    }

    private function ownedOperationalClient(Advisor $advisor, int $clientId): ?Client
    {
        return Client::query()
            ->whereKey($clientId)
            ->where('advisor_id', $advisor->id)
            ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
            ->first();
    }
}
