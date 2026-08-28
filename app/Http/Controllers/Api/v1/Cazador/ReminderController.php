<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\CompleteReminderRequest;
use App\Http\Requests\Api\v1\Cazador\StoreReminderRequest;
use App\Http\Requests\Api\v1\Cazador\UpdateReminderRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReminderController extends Controller
{
    public function __construct(private ClientCrmService $clientCrmService) {}

    public function index(Request $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $query = AdvisorReminder::query()
            ->with('client:id,name,phone')
            ->where('advisor_id', $advisor->id)
            ->visibleForAdvisor()
            ->orderBy('remind_at');

        if ($request->boolean('pending_only')) {
            $query->pending();
        }

        $reminders = $query->get();

        return response()->json([
            'data' => $reminders->map(fn (AdvisorReminder $reminder): array => $this->reminderPayload($reminder))->all(),
        ]);
    }

    public function store(StoreReminderRequest $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $client = $this->ownedOperationalClient($advisor, $request->integer('client_id'));

        if (! $client) {
            return response()->json([
                'message' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.',
            ], 422);
        }

        $validated = $request->validated();

        $reminder = DB::transaction(function () use ($advisor, $client, $validated): AdvisorReminder {
            $reminder = AdvisorReminder::create([
                'advisor_id' => $advisor->id,
                'client_id' => $client->id,
                'title' => $validated['title'],
                'notes' => $validated['notes'] ?? null,
                'remind_at' => $validated['remind_at'],
            ])->load('client');

            $this->clientCrmService->applyFromReminderPayload(
                $client,
                $validated,
                $advisor,
                $reminder,
            );

            $this->clientCrmService->logEvent(
                $client,
                'reminder.created',
                ClientCrmService::SOURCE_CAZADOR,
                $advisor,
                meta: ['reminder_id' => $reminder->id, 'title' => $reminder->title],
            );

            return $reminder;
        });

        return response()->json([
            'message' => 'Recordatorio creado.',
            'data' => $this->reminderPayload($reminder),
        ], 201);
    }

    public function show(Request $request, AdvisorReminder $reminder): JsonResponse
    {
        $owned = $this->ownedReminder($request, $reminder);
        if (! $owned) {
            return response()->json(['message' => 'Recordatorio no encontrado.'], 404);
        }

        return response()->json([
            'data' => $this->reminderPayload($owned->load('client')),
        ]);
    }

    public function update(UpdateReminderRequest $request, AdvisorReminder $reminder): JsonResponse
    {
        $owned = $this->ownedReminder($request, $reminder);
        if (! $owned) {
            return response()->json(['message' => 'Recordatorio no encontrado.'], 404);
        }

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $client = $this->ownedOperationalClient($advisor, $request->integer('client_id'));

        if (! $client) {
            return response()->json([
                'message' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.',
            ], 422);
        }

        $validated = $request->validated();

        $owned = DB::transaction(function () use ($owned, $advisor, $client, $validated): AdvisorReminder {
            $owned->update([
                'client_id' => $client->id,
                'title' => $validated['title'],
                'notes' => $validated['notes'] ?? null,
                'remind_at' => $validated['remind_at'],
            ]);

            $this->clientCrmService->applyFromReminderPayload(
                $client,
                $validated,
                $advisor,
                $owned,
            );

            $this->clientCrmService->logEvent(
                $client,
                'reminder.updated',
                ClientCrmService::SOURCE_CAZADOR,
                $advisor,
                meta: ['reminder_id' => $owned->id, 'title' => $owned->title],
            );

            return $owned->fresh('client');
        });

        return response()->json([
            'message' => 'Recordatorio actualizado.',
            'data' => $this->reminderPayload($owned),
        ]);
    }

    public function destroy(Request $request, AdvisorReminder $reminder): JsonResponse
    {
        $owned = $this->ownedReminder($request, $reminder);
        if (! $owned) {
            return response()->json(['message' => 'Recordatorio no encontrado.'], 404);
        }

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $client = $owned->client;
        $title = $owned->title;
        $reminderId = $owned->id;

        $owned->delete();

        if ($client) {
            $this->clientCrmService->logEvent(
                $client,
                'reminder.deleted',
                ClientCrmService::SOURCE_CAZADOR,
                $advisor,
                meta: ['reminder_id' => $reminderId, 'title' => $title],
            );
        }

        return response()->json(['message' => 'Recordatorio eliminado.'], 200);
    }

    public function complete(CompleteReminderRequest $request, AdvisorReminder $reminder): JsonResponse
    {
        $owned = $this->ownedReminder($request, $reminder);
        if (! $owned) {
            return response()->json(['message' => 'Recordatorio no encontrado.'], 404);
        }

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $validated = $request->validated();

        $owned = DB::transaction(function () use ($owned, $advisor, $validated): AdvisorReminder {
            $owned->update(['completed_at' => now()]);

            $client = $owned->client;
            if ($client) {
                $this->clientCrmService->applyFromReminderPayload(
                    $client,
                    $validated,
                    $advisor,
                    $owned,
                );

                $this->clientCrmService->logEvent(
                    $client,
                    'reminder.completed',
                    ClientCrmService::SOURCE_CAZADOR,
                    $advisor,
                    meta: ['reminder_id' => $owned->id, 'title' => $owned->title],
                );
            }

            return $owned->fresh('client');
        });

        return response()->json([
            'message' => 'Recordatorio marcado como realizado.',
            'data' => $this->reminderPayload($owned),
        ]);
    }

    private function ownedReminder(Request $request, AdvisorReminder $reminder): ?AdvisorReminder
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        return AdvisorReminder::query()
            ->with('client:id,name,phone')
            ->whereKey($reminder->id)
            ->where('advisor_id', $advisor->id)
            ->visibleForAdvisor()
            ->first();
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
     * @return array<string, mixed>
     */
    private function reminderPayload(AdvisorReminder $reminder): array
    {
        return [
            'id' => $reminder->id,
            'client_id' => $reminder->client_id,
            'client' => $reminder->client ? [
                'id' => $reminder->client->id,
                'name' => $reminder->client->name,
                'phone' => $reminder->client->phone,
            ] : null,
            'title' => $reminder->title,
            'notes' => $reminder->notes,
            'remind_at' => $reminder->remind_at?->toAtomString(),
            'completed_at' => $reminder->completed_at?->toAtomString(),
            'created_at' => $reminder->created_at?->toAtomString(),
        ];
    }
}
