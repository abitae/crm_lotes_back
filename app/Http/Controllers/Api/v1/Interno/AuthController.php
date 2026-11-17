<?php

namespace App\Http\Controllers\Api\v1\Interno;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Interno\LoginUserRequest;
use App\Http\Requests\Api\v1\Interno\TwoFactorLoginRequest;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

class AuthController extends Controller
{
    public function login(LoginUserRequest $request): JsonResponse
    {
        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();

        if (! $user || ! Hash::check((string) $request->input('password'), $user->password)) {
            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 422);
        }

        if ($user->hasEnabledTwoFactorAuthentication()) {
            $challengeToken = Str::random(64);
            Cache::put($this->challengeKey($challengeToken), $user->id, now()->addMinutes(5));

            return response()->json([
                'two_factor' => true,
                'challenge_token' => $challengeToken,
            ]);
        }

        return $this->tokenResponse($user, (string) $request->input('device_name', 'Interno'));
    }

    public function twoFactor(TwoFactorLoginRequest $request, TwoFactorAuthenticationProvider $provider): JsonResponse
    {
        $challengeToken = $request->string('challenge_token')->toString();
        $userId = Cache::get($this->challengeKey($challengeToken));
        $user = is_numeric($userId) ? User::query()->find((int) $userId) : null;

        if (! $user || ! $user->hasEnabledTwoFactorAuthentication()) {
            return response()->json([
                'message' => 'El código expiró. Vuelve a iniciar sesión.',
            ], 422);
        }

        $code = $request->string('code')->toString();
        $secret = Fortify::currentEncrypter()->decrypt($user->two_factor_secret);
        $validCode = $provider->verify($secret, $code);
        $recoveryCode = $validCode ? null : collect($user->recoveryCodes())->first(
            fn (string $stored): bool => hash_equals($stored, $code),
        );

        if (! $validCode && ! is_string($recoveryCode)) {
            return response()->json([
                'message' => 'El código de verificación no es válido.',
            ], 422);
        }

        if (is_string($recoveryCode)) {
            $user->replaceRecoveryCode($recoveryCode);
        }

        Cache::forget($this->challengeKey($challengeToken));

        return $this->tokenResponse($user, (string) $request->input('device_name', 'Interno'));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('user_api_token')?->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    private function tokenResponse(User $user, string $deviceName): JsonResponse
    {
        $issuedToken = UserApiToken::issueFor($user, $deviceName !== '' ? $deviceName : 'Interno');

        return response()->json([
            'token' => $issuedToken['plain_text_token'],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    private function challengeKey(string $challengeToken): string
    {
        return 'interno-2fa:'.$challengeToken;
    }
}
