<?php

namespace App\Services\Google;

use App\Models\GoogleAccount;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Datero;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class GoogleAccountService
{
    /**
     * @param  array{sub: string, email: string, name: ?string}  $googleUser
     */
    public function linkAdvisorFromToken(array $googleUser, ?string $accessToken = null, ?string $refreshToken = null, ?array $scopes = null): Advisor
    {
        return DB::transaction(function () use ($googleUser, $accessToken, $refreshToken, $scopes): Advisor {
            $existing = GoogleAccount::query()
                ->where('google_sub', $googleUser['sub'])
                ->first();

            if ($existing?->datero_id) {
                throw new InvalidArgumentException('Esta cuenta de Google ya está vinculada a un datero.');
            }

            if ($existing?->advisor_id) {
                $advisor = Advisor::query()->whereKey($existing->advisor_id)->first();

                if (! $advisor || ! $advisor->is_active) {
                    throw new InvalidArgumentException('Tu cuenta de vendedor está inactiva.');
                }

                $this->updateGoogleAccountTokens($existing, $accessToken, $refreshToken, $scopes);

                return $advisor->fresh(['team', 'level']);
            }

            $advisors = Advisor::query()
                ->with(['team', 'level'])
                ->whereRaw('LOWER(email) = ?', [strtolower($googleUser['email'])])
                ->get();

            if ($advisors->isEmpty()) {
                throw new InvalidArgumentException('Tu cuenta de Google no está asociada a un vendedor.');
            }

            if ($advisors->count() > 1) {
                Log::error('Google login blocked: duplicate advisor emails.', [
                    'email' => $googleUser['email'],
                    'advisor_ids' => $advisors->pluck('id')->all(),
                ]);

                throw new InvalidArgumentException('Hay un conflicto con tu correo. Contacta a soporte.');
            }

            /** @var Advisor $advisor */
            $advisor = $advisors->first();

            if (! $advisor->is_active) {
                throw new InvalidArgumentException('Tu cuenta de vendedor está inactiva.');
            }

            $conflict = GoogleAccount::query()
                ->where('advisor_id', $advisor->id)
                ->where('google_sub', '!=', $googleUser['sub'])
                ->exists();

            if ($conflict) {
                throw new InvalidArgumentException('Este vendedor ya tiene otra cuenta de Google vinculada.');
            }

            GoogleAccount::query()->updateOrCreate(
                ['google_sub' => $googleUser['sub']],
                [
                    'email' => $googleUser['email'],
                    'name' => $googleUser['name'],
                    'advisor_id' => $advisor->id,
                    'datero_id' => null,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_expires_at' => now()->addHour(),
                    'scopes' => $scopes ?? config('google.scopes.login'),
                ],
            );

            return $advisor->fresh(['team', 'level']);
        });
    }

    public function linkAdvisorFromSocialite(SocialiteUser $socialiteUser, ?string $accessToken = null, ?string $refreshToken = null): Advisor
    {
        return $this->linkAdvisorFromToken([
            'sub' => (string) $socialiteUser->getId(),
            'email' => strtolower((string) $socialiteUser->getEmail()),
            'name' => $socialiteUser->getName(),
        ], $accessToken, $refreshToken, config('google.scopes.login'));
    }

    /**
     * @param  array{sub: string, email: string, name: ?string}  $googleUser
     */
    public function loginDatero(array $googleUser): Datero
    {
        $account = GoogleAccount::query()
            ->where('google_sub', $googleUser['sub'])
            ->first();

        if ($account?->advisor_id) {
            throw new InvalidArgumentException('Esta cuenta de Google pertenece a un vendedor.');
        }

        if ($account?->datero_id) {
            return $this->assertDateroCanLogin(
                Datero::query()->with(['assignedAdvisor.team', 'assignedAdvisor.level', 'city'])->find($account->datero_id)
            );
        }

        $datero = Datero::query()
            ->with(['assignedAdvisor.team', 'assignedAdvisor.level', 'city'])
            ->whereRaw('LOWER(email) = ?', [strtolower($googleUser['email'])])
            ->first();

        if ($datero) {
            GoogleAccount::query()->updateOrCreate(
                ['google_sub' => $googleUser['sub']],
                [
                    'email' => $googleUser['email'],
                    'name' => $googleUser['name'],
                    'datero_id' => $datero->id,
                    'advisor_id' => null,
                    'scopes' => config('google.scopes.login'),
                ],
            );

            return $this->assertDateroCanLogin($datero);
        }

        throw new InvalidArgumentException('No encontramos una cuenta de datero con este Google. Regístrate primero.');
    }

    /**
     * @param  array{sub: string, email: string, name: ?string}  $googleUser
     * @param  array{dni: string, phone: string, city_id: int, advisor_id: int}  $profile
     */
    public function registerDatero(array $googleUser, array $profile): Datero
    {
        return DB::transaction(function () use ($googleUser, $profile): Datero {
            $existing = GoogleAccount::query()->where('google_sub', $googleUser['sub'])->first();

            if ($existing?->advisor_id) {
                throw new InvalidArgumentException('Esta cuenta de Google pertenece a un vendedor.');
            }

            if ($existing?->datero_id) {
                throw new InvalidArgumentException('Ya existe una cuenta de datero con este Google.');
            }

            if (Datero::query()->whereRaw('LOWER(email) = ?', [strtolower($googleUser['email'])])->exists()) {
                throw new InvalidArgumentException('Ya existe un datero con este correo.');
            }

            if (Datero::query()->where('dni', $profile['dni'])->exists()) {
                throw new InvalidArgumentException('Ya existe un datero con este DNI.');
            }

            $advisor = Advisor::query()->whereKey($profile['advisor_id'])->where('is_active', true)->first();

            if (! $advisor) {
                throw new InvalidArgumentException('El vendedor seleccionado no está disponible.');
            }

            $username = $this->generateUniqueUsername($googleUser['email']);

            $datero = Datero::create([
                'advisor_id' => $advisor->id,
                'name' => $googleUser['name'] ?? strtok($googleUser['email'], '@'),
                'phone' => $profile['phone'],
                'email' => $googleUser['email'],
                'city_id' => $profile['city_id'],
                'dni' => $profile['dni'],
                'username' => $username,
                'pin' => (string) random_int(100000, 999999),
                'is_active' => true,
            ]);

            GoogleAccount::query()->create([
                'google_sub' => $googleUser['sub'],
                'email' => $googleUser['email'],
                'name' => $googleUser['name'],
                'datero_id' => $datero->id,
                'scopes' => config('google.scopes.login'),
            ]);

            return $datero->fresh(['assignedAdvisor.team', 'assignedAdvisor.level', 'city']);
        });
    }

    public function connectCalendar(Advisor $advisor, SocialiteUser $socialiteUser, ?string $accessToken, ?string $refreshToken): GoogleAccount
    {
        if ((string) $socialiteUser->getId() === '') {
            throw new InvalidArgumentException('No se pudo vincular Google Calendar.');
        }

        $account = GoogleAccount::query()
            ->where('advisor_id', $advisor->id)
            ->first();

        if ($account && $account->google_sub !== (string) $socialiteUser->getId()) {
            throw new InvalidArgumentException('Debes conectar Calendar con la misma cuenta de Google del login.');
        }

        $scopes = array_values(array_unique(array_merge(
            config('google.scopes.login'),
            config('google.scopes.calendar'),
        )));

        return GoogleAccount::query()->updateOrCreate(
            ['advisor_id' => $advisor->id],
            [
                'google_sub' => (string) $socialiteUser->getId(),
                'email' => strtolower((string) $socialiteUser->getEmail()),
                'name' => $socialiteUser->getName(),
                'datero_id' => null,
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken ?? $account?->refresh_token,
                'token_expires_at' => now()->addHour(),
                'scopes' => $scopes,
                'calendar_id' => $account?->calendar_id ?? 'primary',
            ],
        );
    }

    public function disconnectCalendar(Advisor $advisor): void
    {
        $account = GoogleAccount::query()->where('advisor_id', $advisor->id)->first();

        if (! $account) {
            return;
        }

        $account->forceFill([
            'access_token' => null,
            'refresh_token' => null,
            'token_expires_at' => null,
            'calendar_sync_token' => null,
            'scopes' => config('google.scopes.login'),
        ])->save();
    }

    private function updateGoogleAccountTokens(GoogleAccount $account, ?string $accessToken, ?string $refreshToken, ?array $scopes): void
    {
        if ($accessToken !== null) {
            $account->access_token = $accessToken;
            $account->token_expires_at = now()->addHour();
        }

        if ($refreshToken !== null) {
            $account->refresh_token = $refreshToken;
        }

        if ($scopes !== null) {
            $account->scopes = $scopes;
        }

        $account->save();
    }

    private function assertDateroCanLogin(?Datero $datero): Datero
    {
        $advisor = $datero?->assignedAdvisor;

        if (
            ! $datero
            || ! $datero->is_active
            || ! $advisor
            || ! $advisor->is_active
        ) {
            throw new InvalidArgumentException('Credenciales inválidas.');
        }

        return $datero;
    }

    private function generateUniqueUsername(string $email): string
    {
        $base = str((string) str($email)->before('@'))->slug('_')->value();
        $base = $base !== '' ? $base : 'datero';
        $candidate = $base;
        $suffix = 1;

        while (
            Datero::query()->where('username', $candidate)->exists()
            || Advisor::query()->where('username', $candidate)->exists()
        ) {
            $candidate = $base.'_'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
