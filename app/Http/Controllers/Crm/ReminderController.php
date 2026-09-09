<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreReminderRequest;
use App\Http\Requests\Crm\UpdateReminderRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Services\Crm\CrmRemindersIndexQuery;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReminderController extends Controller
{
    public function __construct(
        private ClientCrmService $clientCrmService,
        private CrmRemindersIndexQuery $remindersIndexQuery,
    ) {}

    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $query = AdvisorReminder::query()
            ->with('client:id,name,phone')
            ->where('advisor_id', $advisor->id)
            ->visibleForAdvisor();

        $this->remindersIndexQuery->apply($query, $request);
        $this->remindersIndexQuery->applyOrdering($query, $request);

        $reminders = $query
            ->paginate(CrmRemindersIndexQuery::DEFAULT_PER_PAGE)
            ->withQueryString();

        return Inertia::render('crm/reminders/index', [
            'reminders' => $reminders,
            'clients' => $this->filterClientsForIndex($advisor, $request),
            'filters' => $this->remindersIndexQuery->filtersFromRequest($request),
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

    /**
     * Seed the client picker with the currently filtered client only.
     * Full search goes through GET /crm/clients/search so the page does not
     * preload the entire cartera.
     *
     * @return Collection<int, Client>
     */
    private function filterClientsForIndex(Advisor $advisor, Request $request)
    {
        $clientId = $request->filled('client_id') ? $request->integer('client_id') : 0;

        if ($clientId < 1 || ! $this->ownedOperationalClient($advisor, $clientId)) {
            return collect();
        }

        return Client::query()->whereKey($clientId)->get(['id', 'name', 'dni', 'phone']);
    }
}
