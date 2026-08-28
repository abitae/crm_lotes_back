<?php

namespace App\Services\Google;

use App\Contracts\Google\GoogleIdTokenVerifier;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class GoogleIdTokenVerifierService implements GoogleIdTokenVerifier
{
    /**
     * @return array{sub: string, email: string, name: ?string, email_verified: bool}
     */
    public function verify(string $idToken, string $audience): array
    {
        $client = new GoogleClient([
            'client_id' => $audience,
        ]);

        $payload = $client->verifyIdToken($idToken);

        if (! is_array($payload)) {
            Log::warning('Google ID token verification failed.', ['audience' => $audience]);

            throw new InvalidArgumentException('Token de Google inválido.');
        }

        if (($payload['aud'] ?? null) !== $audience) {
            throw new InvalidArgumentException('Token de Google inválido para esta aplicación.');
        }

        $email = strtolower((string) ($payload['email'] ?? ''));
        $sub = (string) ($payload['sub'] ?? '');

        if ($sub === '' || $email === '') {
            throw new InvalidArgumentException('Token de Google incompleto.');
        }

        if (($payload['email_verified'] ?? false) !== true) {
            throw new InvalidArgumentException('El correo de Google no está verificado.');
        }

        return [
            'sub' => $sub,
            'email' => $email,
            'name' => isset($payload['name']) ? (string) $payload['name'] : null,
            'email_verified' => true,
        ];
    }
}
