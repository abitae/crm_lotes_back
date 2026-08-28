<?php

namespace App\Services\Meta\Normalizers;

/**
 * @phpstan-type NormalizedMessage array{
 *     channel: string,
 *     external_id: string,
 *     external_user_id: string,
 *     direction: string,
 *     content_type: string,
 *     body: ?string,
 *     media_url: ?string,
 *     profile_name: ?string,
 *     phone: ?string,
 *     status: ?string,
 *     raw: array<string, mixed>
 * }
 */
class WhatsAppNormalizer
{
    /**
     * @param  array<string, mixed>  $change
     * @return list<NormalizedMessage>
     */
    public function normalize(array $change): array
    {
        $value = $change['value'] ?? [];
        if (! is_array($value)) {
            return [];
        }

        $messages = [];
        $field = $change['field'] ?? 'messages';

        if ($field === 'messages' || isset($value['messages'])) {
            foreach ($value['messages'] ?? [] as $message) {
                if (! is_array($message)) {
                    continue;
                }

                $messages[] = $this->normalizeInboundMessage($message, $value);
            }
        }

        foreach ($value['statuses'] ?? [] as $status) {
            if (! is_array($status)) {
                continue;
            }

            $messages[] = [
                'channel' => 'whatsapp',
                'external_id' => (string) ($status['id'] ?? uniqid('wa_status_', true)),
                'external_user_id' => (string) ($status['recipient_id'] ?? ''),
                'direction' => 'outbound',
                'content_type' => 'status',
                'body' => null,
                'media_url' => null,
                'profile_name' => null,
                'phone' => isset($status['recipient_id']) ? (string) $status['recipient_id'] : null,
                'status' => (string) ($status['status'] ?? 'unknown'),
                'raw' => $status,
            ];
        }

        return $messages;
    }

    /**
     * @param  array<string, mixed>  $message
     * @param  array<string, mixed>  $value
     * @return NormalizedMessage
     */
    private function normalizeInboundMessage(array $message, array $value): array
    {
        $type = (string) ($message['type'] ?? 'text');
        $body = null;
        $mediaUrl = null;

        if ($type === 'text') {
            $body = $message['text']['body'] ?? null;
        } elseif (in_array($type, ['image', 'audio', 'video', 'document'], true)) {
            $mediaUrl = $message[$type]['id'] ?? null;
            $body = $message[$type]['caption'] ?? null;
        }

        $contact = $value['contacts'][0] ?? [];
        $profileName = is_array($contact) ? ($contact['profile']['name'] ?? null) : null;
        $phone = (string) ($message['from'] ?? '');

        return [
            'channel' => 'whatsapp',
            'external_id' => (string) ($message['id'] ?? uniqid('wa_', true)),
            'external_user_id' => $phone,
            'direction' => 'inbound',
            'content_type' => $type,
            'body' => is_string($body) ? $body : null,
            'media_url' => is_string($mediaUrl) ? $mediaUrl : null,
            'profile_name' => is_string($profileName) ? $profileName : null,
            'phone' => $phone ?: null,
            'status' => 'received',
            'raw' => $message,
        ];
    }
}
