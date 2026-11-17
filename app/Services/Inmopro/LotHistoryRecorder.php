<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotHistory;
use App\Models\Inmopro\LotStatus;
use App\Models\User;

/**
 * Records the lot change history. The LotObserver calls record() on every
 * relevant change; callers that know *why* the lot changed (release with a
 * reason, transfer with payer and vouchers, ...) wrap the update in
 * withContext() so that the entry carries the event, reason and extra data.
 */
class LotHistoryRecorder
{
    /**
     * @var array<int, array{event?: string, reason?: string|null, notes?: string|null, meta?: array<string, mixed>}>
     */
    private array $contexts = [];

    /**
     * @template T
     *
     * @param  array{event?: string, reason?: string|null, notes?: string|null, meta?: array<string, mixed>}  $context
     * @param  callable(): T  $callback
     * @return T
     */
    public function withContext(array $context, callable $callback): mixed
    {
        $this->contexts[] = $context;

        try {
            return $callback();
        } finally {
            array_pop($this->contexts);
        }
    }

    public function recordCreated(Lot $lot): void
    {
        $this->write($lot, LotHistory::EVENT_CREATED, null, $lot->lot_status_id, [
            'client_id' => $lot->client_id,
            'client_name' => $lot->client_name,
            'client_dni' => $lot->client_dni,
            'advisor_id' => $lot->advisor_id,
        ]);
    }

    public function recordUpdated(Lot $lot): void
    {
        $statusChanged = $lot->wasChanged('lot_status_id');
        $clientChanged = $lot->wasChanged('client_id') || $lot->wasChanged('advisor_id');

        if (! $statusChanged && ! $clientChanged) {
            return;
        }

        $fromStatusId = $statusChanged ? $lot->getOriginal('lot_status_id') : $lot->lot_status_id;
        $toStatusId = $lot->lot_status_id;
        $event = $this->resolveEvent($fromStatusId, $toStatusId, $statusChanged);

        $releasing = in_array($event, [
            LotHistory::EVENT_RELEASED,
            LotHistory::EVENT_SALE_FALLEN,
            LotHistory::EVENT_PRE_RESERVATION_RELEASED,
        ], true) || ($this->currentContext()['event'] ?? null) === LotHistory::EVENT_SALE_FALLEN;

        // When the lot is freed, keep who had it; otherwise, who has it now.
        $holder = $releasing
            ? [
                'client_id' => $lot->getOriginal('client_id'),
                'client_name' => $lot->getOriginal('client_name'),
                'client_dni' => $lot->getOriginal('client_dni'),
                'advisor_id' => $lot->getOriginal('advisor_id'),
            ]
            : [
                'client_id' => $lot->client_id,
                'client_name' => $lot->client_name,
                'client_dni' => $lot->client_dni,
                'advisor_id' => $lot->advisor_id,
            ];

        $this->write($lot, $event, $fromStatusId, $toStatusId, $holder);
    }

    /**
     * @param  array{client_id: mixed, client_name: mixed, client_dni: mixed, advisor_id: mixed}  $holder
     */
    private function write(Lot $lot, string $event, mixed $fromStatusId, mixed $toStatusId, array $holder): void
    {
        $context = $this->currentContext();
        // CRM / Cazador authenticate advisors, not users: only users go in user_id.
        $actor = auth()->user();
        $user = $actor instanceof User ? $actor : null;
        $actorName = match (true) {
            $user !== null => $user->name,
            $actor instanceof Advisor => $actor->name.' (asesor)',
            $actor !== null && isset($actor->name) => (string) $actor->name,
            default => 'Sistema',
        };
        $advisorId = $holder['advisor_id'] !== null ? (int) $holder['advisor_id'] : null;

        LotHistory::query()->create([
            'lot_id' => $lot->id,
            'event' => $context['event'] ?? $event,
            'from_status_id' => $fromStatusId !== null ? (int) $fromStatusId : null,
            'to_status_id' => $toStatusId !== null ? (int) $toStatusId : null,
            'client_id' => $holder['client_id'] !== null ? (int) $holder['client_id'] : null,
            'client_name' => $holder['client_name'],
            'client_dni' => $holder['client_dni'],
            'advisor_id' => $advisorId,
            'advisor_name' => $advisorId !== null ? Advisor::query()->whereKey($advisorId)->value('name') : null,
            'user_id' => $user?->id,
            'user_name' => $actorName,
            'reason' => $context['reason'] ?? null,
            'notes' => $context['notes'] ?? null,
            'meta' => $context['meta'] ?? null,
            'created_at' => now(),
        ]);
    }

    private function resolveEvent(mixed $fromStatusId, mixed $toStatusId, bool $statusChanged): string
    {
        if (! $statusChanged) {
            return LotHistory::EVENT_CLIENT_CHANGED;
        }

        $codes = LotStatus::query()
            ->whereIn('id', array_filter([$fromStatusId, $toStatusId], fn ($id) => $id !== null))
            ->pluck('code', 'id');

        $from = $fromStatusId !== null ? ($codes[(int) $fromStatusId] ?? null) : null;
        $to = $toStatusId !== null ? ($codes[(int) $toStatusId] ?? null) : null;

        return match (true) {
            $to === LotStatus::CODE_PRERESERVA => LotHistory::EVENT_PRE_RESERVED,
            $to === LotStatus::CODE_LIBRE && $from === LotStatus::CODE_PRERESERVA => LotHistory::EVENT_PRE_RESERVATION_RELEASED,
            $to === LotStatus::CODE_LIBRE => LotHistory::EVENT_RELEASED,
            $to === LotStatus::CODE_RESERVADO && $from === LotStatus::CODE_TRANSFERIDO => LotHistory::EVENT_TRANSFER_REJECTED,
            $to === LotStatus::CODE_RESERVADO => LotHistory::EVENT_RESERVED,
            $to === LotStatus::CODE_CUOTAS => LotHistory::EVENT_INSTALLMENTS,
            $to === LotStatus::CODE_TRANSFERIDO => LotHistory::EVENT_TRANSFERRED,
            default => LotHistory::EVENT_STATUS_CHANGED,
        };
    }

    /**
     * @return array{event?: string, reason?: string|null, notes?: string|null, meta?: array<string, mixed>}
     */
    private function currentContext(): array
    {
        return $this->contexts === [] ? [] : $this->contexts[array_key_last($this->contexts)];
    }
}
