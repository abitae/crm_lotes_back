<?php

namespace App\Services\Meta;

use App\Models\Meta\MetaConnection;

class MetaConnectionRouter
{
    public function findByPhoneNumberId(?string $phoneNumberId): ?MetaConnection
    {
        if (blank($phoneNumberId)) {
            return null;
        }

        return MetaConnection::query()
            ->where('phone_number_id', $phoneNumberId)
            ->where('status', MetaConnection::STATUS_ACTIVE)
            ->first();
    }

    public function findByPageId(?string $pageId): ?MetaConnection
    {
        if (blank($pageId)) {
            return null;
        }

        return MetaConnection::query()
            ->where('page_id', $pageId)
            ->where('status', MetaConnection::STATUS_ACTIVE)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function resolveFromWebhookPayload(array $payload): ?MetaConnection
    {
        if (($payload['object'] ?? null) === 'whatsapp_business_account') {
            foreach ($payload['entry'] ?? [] as $entry) {
                foreach ($entry['changes'] ?? [] as $change) {
                    $phoneNumberId = $change['value']['metadata']['phone_number_id'] ?? null;

                    if ($connection = $this->findByPhoneNumberId(is_string($phoneNumberId) ? $phoneNumberId : null)) {
                        return $connection;
                    }
                }
            }
        }

        if (($payload['object'] ?? null) === 'page') {
            foreach ($payload['entry'] ?? [] as $entry) {
                $pageId = $entry['id'] ?? null;

                if ($connection = $this->findByPageId(is_string($pageId) ? $pageId : null)) {
                    return $connection;
                }
            }
        }

        if (($payload['object'] ?? null) === 'instagram') {
            foreach ($payload['entry'] ?? [] as $entry) {
                $igUserId = $entry['id'] ?? null;

                if (is_string($igUserId)) {
                    $connection = MetaConnection::query()
                        ->where('ig_user_id', $igUserId)
                        ->where('status', MetaConnection::STATUS_ACTIVE)
                        ->first();

                    if ($connection) {
                        return $connection;
                    }
                }
            }
        }

        return null;
    }
}
