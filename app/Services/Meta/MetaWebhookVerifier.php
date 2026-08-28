<?php

namespace App\Services\Meta;

class MetaWebhookVerifier
{
    public function verifySubscription(string $mode, string $token, string $challenge): ?string
    {
        if ($mode === 'subscribe' && hash_equals((string) config('meta.verify_token'), $token)) {
            return $challenge;
        }

        return null;
    }

    public function verifySignature(string $payload, ?string $signatureHeader): bool
    {
        $secret = config('meta.app_secret');

        if (blank($secret) || blank($signatureHeader)) {
            return app()->environment('local', 'testing');
        }

        if (! str_starts_with($signatureHeader, 'sha256=')) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $payload, (string) $secret);

        return hash_equals($expected, $signatureHeader);
    }
}
