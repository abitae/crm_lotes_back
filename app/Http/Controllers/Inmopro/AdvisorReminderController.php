<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreAdvisorReminderRequest;
use App\Http\Requests\Inmopro\UpdateAdvisorReminderRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class AdvisorReminderController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function store(StoreAdvisorReminderRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated): void {
            $reminder = AdvisorReminder::create([
                'advisor_id' => $validated['advisor_id'],
                'client_id' => $validated['client_id'],
                'title' => $validated['title'],
                'notes' => $validated['notes'] ?? null,
                'remind_at' => $validated['remind_at'],
            ]);

            $client = Client::query()->find($validated['client_id']);
            $advisor = Advisor::query()->find($validated['advisor_id']);

            if ($client && $advisor) {
                $this->clientCrmService->applyFromReminderPayload(
                    $client,
                    $validated,
                    $advisor,
                    $reminder,
                    ClientCrmService::SOURCE_INMOPRO,
                );
                $this->clientCrmService->logEvent(
                    $client,
                    'reminder.created',
                    ClientCrmService::SOURCE_INMOPRO,
                    $advisor,
                    meta: ['reminder_id' => $reminder->id, 'title' => $reminder->title],
                );
            }
        });

        return redirect()
            ->route('inmopro.agenda.index', ['advisor_id' => $validated['advisor_id']])
            ->with('success', 'Recordatorio creado.');
    }

    public function update(UpdateAdvisorReminderRequest $request, AdvisorReminder $advisor_reminder): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $advisor_reminder): void {
            $advisor_reminder->update([
                'advisor_id' => $validated['advisor_id'],
                'client_id' => $validated['client_id'],
                'title' => $validated['title'],
                'notes' => $validated['notes'] ?? null,
                'remind_at' => $validated['remind_at'],
            ]);

            $client = Client::query()->find($validated['client_id']);
            $advisor = Advisor::query()->find($validated['advisor_id']);

            if ($client && $advisor) {
                $this->clientCrmService->applyFromReminderPayload(
                    $client,
                    $validated,
                    $advisor,
                    $advisor_reminder,
                    ClientCrmService::SOURCE_INMOPRO,
                );
                $this->clientCrmService->logEvent(
                    $client,
                    'reminder.updated',
                    ClientCrmService::SOURCE_INMOPRO,
                    $advisor,
                    meta: ['reminder_id' => $advisor_reminder->id, 'title' => $advisor_reminder->title],
                );
            }
        });

        return redirect()
            ->route('inmopro.agenda.index', ['advisor_id' => $validated['advisor_id']])
            ->with('success', 'Recordatorio actualizado.');
    }

    public function destroy(AdvisorReminder $advisor_reminder): RedirectResponse
    {
        $advisorId = $advisor_reminder->advisor_id;
        $advisor_reminder->delete();

        return redirect()
            ->route('inmopro.agenda.index', ['advisor_id' => $advisorId])
            ->with('success', 'Recordatorio eliminado.');
    }

    public function complete(AdvisorReminder $advisor_reminder): RedirectResponse
    {
        $advisor_reminder->update(['completed_at' => now()]);

        return redirect()
            ->route('inmopro.agenda.index', ['advisor_id' => $advisor_reminder->advisor_id])
            ->with('success', 'Recordatorio marcado como realizado.');
    }
}
