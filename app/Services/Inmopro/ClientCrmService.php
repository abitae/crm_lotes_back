<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientCrmEvent;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientStatusChange;
use App\Models\Inmopro\ClientTag;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientCrmService
{
    public const SOURCE_CAZADOR = 'cazador';

    public const SOURCE_INMOPRO = 'inmopro';

    public const SOURCE_CRM = 'crm';

    /**
     * Acciones permitidas desde POST /clients/{id}/crm/events (UI sin mutación propia).
     *
     * @var list<string>
     */
    public const EXPLICIT_ACTIONS = [
        'client.opened',
        'client.lots_viewed',
        'client.sheet_cancelled',
        'whatsapp.message',
    ];

    /**
     * @var array<string, string>
     */
    private const ACTION_LABELS = [
        'client.created' => 'Cliente creado',
        'client.opened' => 'Abrió ficha del cliente',
        'client.edited' => 'Editó datos del cliente',
        'client.crm_updated' => 'Actualizó seguimiento CRM',
        'client.status_changed' => 'Cambió estado de seguimiento',
        'client.lots_viewed' => 'Vio lotes relacionados',
        'client.sheet_cancelled' => 'Cerró menú del cliente',
        'whatsapp.message' => 'WhatsApp',
        'reminder.created' => 'Creó recordatorio',
        'reminder.updated' => 'Actualizó recordatorio',
        'reminder.completed' => 'Completó recordatorio',
        'reminder.deleted' => 'Eliminó recordatorio',
        'ticket.created' => 'Creó ticket de atención',
        'ticket.cancelled' => 'Canceló ticket de atención',
        'pre_reservation.created' => 'Registró pre-reserva',
    ];

    /**
     * @param  list<int>|null  $tagIds  null = no cambiar tags; array = sincronizar
     */
    public function applyCrmFields(
        Client $client,
        ?int $statusId = null,
        ?array $tagIds = null,
        ?Advisor $advisor = null,
        ?AdvisorReminder $reminder = null,
        bool $allowNullStatus = false,
        string $source = self::SOURCE_CAZADOR,
        ?User $user = null,
    ): Client {
        return DB::transaction(function () use ($client, $statusId, $tagIds, $advisor, $reminder, $allowNullStatus, $source, $user): Client {
            $beforeStatusId = $client->client_status_id;
            $tagsTouched = $tagIds !== null;

            if ($statusId !== null || $allowNullStatus) {
                $this->changeStatus($client, $statusId, $advisor, $reminder, $source, $user);
                $client->refresh();
            }

            if ($tagIds !== null) {
                $this->syncTags($client, $tagIds);
            }

            $statusChanged = $beforeStatusId !== $client->client_status_id;

            if ($tagsTouched) {
                $this->logEvent(
                    $client,
                    'client.crm_updated',
                    $source,
                    $advisor,
                    $user,
                    [
                        'tag_ids' => $tagIds,
                        'reminder_id' => $reminder?->id,
                        'with_status_change' => $statusChanged,
                    ],
                );
            }

            return $client->fresh(['status', 'tags', 'type', 'city']);
        });
    }

    public function changeStatus(
        Client $client,
        ?int $toStatusId,
        ?Advisor $advisor = null,
        ?AdvisorReminder $reminder = null,
        string $source = self::SOURCE_CAZADOR,
        ?User $user = null,
    ): void {
        $fromStatusId = $client->client_status_id;

        if ($fromStatusId === $toStatusId) {
            return;
        }

        if ($toStatusId !== null) {
            $exists = ClientStatus::query()
                ->whereKey($toStatusId)
                ->where('is_active', true)
                ->exists();

            if (! $exists) {
                throw ValidationException::withMessages([
                    'client_status_id' => 'El estado de seguimiento no es válido o está inactivo.',
                ]);
            }
        }

        $fromName = $fromStatusId
            ? ClientStatus::query()->whereKey($fromStatusId)->value('name')
            : null;
        $toName = $toStatusId
            ? ClientStatus::query()->whereKey($toStatusId)->value('name')
            : null;

        $client->forceFill(['client_status_id' => $toStatusId])->save();

        ClientStatusChange::query()->create([
            'client_id' => $client->id,
            'from_status_id' => $fromStatusId,
            'to_status_id' => $toStatusId,
            'advisor_id' => $advisor?->id ?? $client->advisor_id,
            'reminder_id' => $reminder?->id,
        ]);

        $this->logEvent(
            $client,
            'client.status_changed',
            $source,
            $advisor ?? $client->advisor,
            $user,
            [
                'from_status_id' => $fromStatusId,
                'to_status_id' => $toStatusId,
                'from_status' => $fromName,
                'to_status' => $toName,
                'reminder_id' => $reminder?->id,
            ],
        );
    }

    /**
     * @param  list<int>  $tagIds
     */
    public function syncTags(Client $client, array $tagIds): void
    {
        $uniqueIds = array_values(array_unique(array_map('intval', $tagIds)));

        if ($uniqueIds === []) {
            $client->tags()->sync([]);

            return;
        }

        $validIds = ClientTag::query()
            ->whereIn('id', $uniqueIds)
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        if (count($validIds) !== count($uniqueIds)) {
            throw ValidationException::withMessages([
                'tag_ids' => 'Una o más etiquetas no son válidas o están inactivas.',
            ]);
        }

        $client->tags()->sync($validIds);
    }

    /**
     * Aplica CRM opcional desde payload de recordatorio (crear/editar/completar).
     *
     * @param  array{client_status_id?: int|null, tag_ids?: list<int>|null}  $crmPayload
     */
    public function applyFromReminderPayload(
        Client $client,
        array $crmPayload,
        Advisor $advisor,
        AdvisorReminder $reminder,
        string $source = self::SOURCE_CAZADOR,
        ?User $user = null,
    ): Client {
        $hasStatus = array_key_exists('client_status_id', $crmPayload);
        $hasTags = array_key_exists('tag_ids', $crmPayload);

        if (! $hasStatus && ! $hasTags) {
            return $client;
        }

        $statusId = $hasStatus ? ($crmPayload['client_status_id'] !== null ? (int) $crmPayload['client_status_id'] : null) : null;
        $tagIds = $hasTags ? array_values(array_map('intval', $crmPayload['tag_ids'] ?? [])) : null;

        return $this->applyCrmFields(
            $client,
            $hasStatus ? $statusId : null,
            $tagIds,
            $advisor,
            $reminder,
            allowNullStatus: $hasStatus && $statusId === null,
            source: $source,
            user: $user,
        );
    }

    /**
     * @param  array<string, mixed>|null  $meta
     */
    public function logEvent(
        Client $client,
        string $action,
        string $source = self::SOURCE_CAZADOR,
        ?Advisor $advisor = null,
        ?User $user = null,
        ?array $meta = null,
        ?string $label = null,
    ): ClientCrmEvent {
        if (! in_array($source, [self::SOURCE_CAZADOR, self::SOURCE_INMOPRO, self::SOURCE_CRM], true)) {
            throw ValidationException::withMessages([
                'source' => 'Origen de evento CRM no válido.',
            ]);
        }

        $resolvedLabel = $label ?? (self::ACTION_LABELS[$action] ?? $action);

        if ($action === 'whatsapp.message' && isset($meta['preview']) && is_string($meta['preview'])) {
            $meta['preview'] = mb_substr($meta['preview'], 0, 500);
        }

        return ClientCrmEvent::query()->create([
            'client_id' => $client->id,
            'advisor_id' => $advisor?->id ?? $client->advisor_id,
            'user_id' => $user?->id,
            'source' => $source,
            'action' => $action,
            'label' => $resolvedLabel,
            'meta' => $meta,
        ]);
    }

    public function labelFor(string $action): string
    {
        return self::ACTION_LABELS[$action] ?? $action;
    }

    public function isExplicitAction(string $action): bool
    {
        return in_array($action, self::EXPLICIT_ACTIONS, true);
    }
}
