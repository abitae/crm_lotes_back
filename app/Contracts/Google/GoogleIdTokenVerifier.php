<?php

namespace App\Contracts\Google;

interface GoogleIdTokenVerifier
{
    /**
     * @return array{sub: string, email: string, name: ?string, email_verified: bool}
     */
    public function verify(string $idToken, string $audience): array;
}
