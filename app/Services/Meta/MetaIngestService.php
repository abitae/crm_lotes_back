<?php

namespace App\Services\Meta;

use App\Automation\AutomationEngine;
use App\Events\Meta\MetaMessageReceived;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaContactIdentity;
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;
use App\Models\Meta\MetaWebhookEvent;
use App\Services\Inmopro\ClientCrmService;
use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use App\Services\Meta\Normalizers\InstagramNormalizer;
use App\Services\Meta\Normalizers\MessengerNormalizer;
use App\Services\Meta\Normalizers\WhatsAppNormalizer;
use Illuminate\Support\Facades\DB;

class MetaIngestService
{
    public function __construct(
        private MetaConnectionRouter $router,
        private WhatsAppNormalizer $whatsAppNormalizer,
        private MessengerNormalizer $messengerNormalizer,
        private InstagramNormalizer $instagramNormalizer,
        private ContactMatcherService $contactMatcher,
        private ClientCrmService $clientCrmService,
        private ClientDuplicateRegistrationChecker $duplicateChecker,
        private AutomationEngine $automationEngine,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function ingest(array $payload): void
    {
        $eventHash = hash('sha256', json_encode($payload) ?: '');

        if (MetaWebhookEvent::query()->where('event_hash', $eventHash)->exists()) {
            return;
        }

        $connection = $this->router->resolveFromWebhookPayload($payload);

        $webhookEvent = MetaWebhookEvent::query()->create([
            'event_hash' => $eventHash,
            'meta_connection_id' => $connection?->id,
            'object_type' => is_string($payload['object'] ?? null) ? $payload['object'] : null,
            'payload' => $payload,
        ]);

        $normalizedMessages = $this->extractNormalizedMessages($payload);

        foreach ($normalizedMessages as $normalized) {
            if (($normalized['content_type'] ?? '') === 'status' || ($normalized['content_type'] ?? '') === 'read') {
                $this->updateMessageStatus($normalized);

                continue;
            }

            if (! $connection) {
                continue;
            }

            $this->processInboundOrOutbound($connection, $normalized);
        }

        $webhookEvent->update(['processed_at' => now()]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array<string, mixed>>
     */
    private function extractNormalizedMessages(array $payload): array
    {
        $messages = [];
        $object = $payload['object'] ?? null;

        if ($object === 'whatsapp_business_account') {
            foreach ($payload['entry'] ?? [] as $entry) {
                if (! is_array($entry)) {
                    continue;
                }

                foreach ($entry['changes'] ?? [] as $change) {
                    if (is_array($change)) {
                        array_push($messages, ...$this->whatsAppNormalizer->normalize($change));
                    }
                }
            }
        }

        if ($object === 'page') {
            foreach ($payload['entry'] ?? [] as $entry) {
                if (is_array($entry)) {
                    array_push($messages, ...$this->messengerNormalizer->normalize($entry, 'messenger'));
                }
            }
        }

        if ($object === 'instagram') {
            foreach ($payload['entry'] ?? [] as $entry) {
                if (is_array($entry)) {
                    array_push($messages, ...$this->instagramNormalizer->normalizeInstagram($entry));
                }
            }
        }

        return $messages;
    }

    /**
     * @param  array<string, mixed>  $normalized
     */
    private function processInboundOrOutbound(MetaConnection $connection, array $normalized): void
    {
        if (MetaMessage::query()->where('external_id', (string) $normalized['external_id'])->exists()) {
            return;
        }

        DB::transaction(function () use ($connection, $normalized): void {
            $identity = $this->resolveIdentity($connection, $normalized);
            $conversation = $this->resolveConversation($connection, $identity, (string) $normalized['channel']);

            $client = $conversation->client;
            $hasConflict = false;

            if ($normalized['direction'] === MetaMessage::DIRECTION_INBOUND && ! $client) {
                $match = $this->contactMatcher->matchOrCreate(
                    $connection,
                    $identity,
                    is_string($normalized['profile_name'] ?? null) ? $normalized['profile_name'] : null,
                );

                $hasConflict = $match['conflict'];
                $client = $match['client'];

                if ($client) {
                    $conversation->update([
                        'client_id' => $client->id,
                        'has_client_conflict' => false,
                    ]);
                } elseif ($hasConflict) {
                    $conversation->update(['has_client_conflict' => true]);
                }
            }

            $message = MetaMessage::query()->create([
                'conversation_id' => $conversation->id,
                'direction' => (string) $normalized['direction'],
                'content_type' => (string) ($normalized['content_type'] ?? 'text'),
                'body' => $normalized['body'] ?? null,
                'media_url' => $normalized['media_url'] ?? null,
                'external_id' => (string) $normalized['external_id'],
                'status' => (string) ($normalized['status'] ?? 'received'),
                'meta' => ['raw' => $normalized['raw'] ?? []],
            ]);

            $conversation->update([
                'last_message_at' => now(),
                'last_inbound_at' => $normalized['direction'] === MetaMessage::DIRECTION_INBOUND ? now() : $conversation->last_inbound_at,
            ]);

            if ($client && $normalized['direction'] === MetaMessage::DIRECTION_INBOUND) {
                $connection->loadMissing('advisor');

                $this->clientCrmService->logEvent(
                    $client,
                    'meta.message.inbound',
                    ClientCrmService::SOURCE_CRM,
                    $connection->advisor,
                    meta: [
                        'channel' => $normalized['channel'],
                        'preview' => mb_substr((string) ($normalized['body'] ?? ''), 0, 500),
                        'conversation_id' => $conversation->id,
                    ],
                );
            }

            if ($normalized['direction'] === MetaMessage::DIRECTION_INBOUND && $conversation->bot_enabled) {
                $this->automationEngine->handleInbound($conversation, $message);
            }

            MetaMessageReceived::dispatch($message->fresh(['conversation']), $connection->advisor_id);
        });
    }

    /**
     * @param  array<string, mixed>  $normalized
     */
    private function resolveIdentity(MetaConnection $connection, array $normalized): MetaContactIdentity
    {
        $phone = is_string($normalized['phone'] ?? null) ? $normalized['phone'] : null;

        return MetaContactIdentity::query()->updateOrCreate(
            [
                'meta_connection_id' => $connection->id,
                'channel' => (string) $normalized['channel'],
                'external_user_id' => (string) $normalized['external_user_id'],
            ],
            [
                'advisor_id' => $connection->advisor_id,
                'phone' => $phone,
                'phone_normalized' => $phone ? $this->duplicateChecker->normalizePhone($phone) : null,
                'profile_name' => is_string($normalized['profile_name'] ?? null) ? $normalized['profile_name'] : null,
            ],
        );
    }

    private function resolveConversation(
        MetaConnection $connection,
        MetaContactIdentity $identity,
        string $channel,
    ): MetaConversation {
        return MetaConversation::query()->firstOrCreate(
            [
                'meta_connection_id' => $connection->id,
                'contact_identity_id' => $identity->id,
                'channel' => $channel,
            ],
            [
                'advisor_id' => $connection->advisor_id,
                'status' => MetaConversation::STATUS_OPEN,
                'bot_enabled' => true,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $normalized
     */
    private function updateMessageStatus(array $normalized): void
    {
        $externalId = (string) ($normalized['raw']['id'] ?? '');

        if ($externalId === '') {
            return;
        }

        MetaMessage::query()
            ->where('external_id', $externalId)
            ->update(['status' => (string) ($normalized['status'] ?? 'unknown')]);
    }
}
