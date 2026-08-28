<?php

namespace App\Services\Meta\Normalizers;

class MessengerNormalizer
{
    /**
     * @param  array<string, mixed>  $entry
     * @return list<array<string, mixed>>
     */
    public function normalize(array $entry, string $channel = 'messenger'): array
    {
        $messages = [];

        foreach ($entry['messaging'] ?? [] as $event) {
            if (! is_array($event)) {
                continue;
            }

            if (isset($event['message']) && is_array($event['message'])) {
                $messages[] = $this->normalizeMessageEvent($event, $channel);
            } elseif (isset($event['read']) && is_array($event['read'])) {
                $messages[] = [
                    'channel' => $channel,
                    'external_id' => 'read_'.($event['read']['watermark'] ?? uniqid()),
                    'external_user_id' => (string) ($event['sender']['id'] ?? ''),
                    'direction' => 'inbound',
                    'content_type' => 'read',
                    'body' => null,
                    'media_url' => null,
                    'profile_name' => null,
                    'phone' => null,
                    'status' => 'read',
                    'raw' => $event,
                ];
            }
        }

        return $messages;
    }

    /**
     * @param  array<string, mixed>  $event
     * @return array<string, mixed>
     */
    private function normalizeMessageEvent(array $event, string $channel): array
    {
        $message = $event['message'];
        $isEcho = (bool) ($message['is_echo'] ?? false);
        $senderId = (string) ($isEcho ? ($event['recipient']['id'] ?? '') : ($event['sender']['id'] ?? ''));
        $type = 'text';
        $body = null;
        $mediaUrl = null;

        if (isset($message['text']) && is_array($message['text'])) {
            $body = $message['text']['body'] ?? null;
        } elseif (isset($message['attachments'][0]) && is_array($message['attachments'][0])) {
            $attachment = $message['attachments'][0];
            $type = (string) ($attachment['type'] ?? 'file');
            $mediaUrl = $attachment['payload']['url'] ?? null;
        }

        return [
            'channel' => $channel,
            'external_id' => (string) ($message['mid'] ?? uniqid('msg_', true)),
            'external_user_id' => $senderId,
            'direction' => $isEcho ? 'outbound' : 'inbound',
            'content_type' => $type,
            'body' => is_string($body) ? $body : null,
            'media_url' => is_string($mediaUrl) ? $mediaUrl : null,
            'profile_name' => null,
            'phone' => null,
            'status' => $isEcho ? 'sent' : 'received',
            'raw' => $event,
        ];
    }
}
