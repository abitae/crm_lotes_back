<?php

namespace App\Http\Controllers\Api\v1\Datero;

use App\Contracts\Google\GoogleIdTokenVerifier;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Datero\GoogleLoginRequest;
use App\Http\Requests\Api\v1\Datero\GoogleRegisterRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Datero;
use App\Models\Inmopro\DateroApiToken;
use App\Notifications\Datero\DateroJoinedAdvisorNotification;
use App\Services\Google\GoogleAccountService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class GoogleAuthController extends Controller
{
    public function login(
        GoogleLoginRequest $request,
        GoogleIdTokenVerifier $verifier,
        GoogleAccountService $googleAccountService,
    ): JsonResponse {
        $payload = $this->verifyDateroToken($request->string('id_token')->toString(), $verifier);

        if ($payload === null) {
            return response()->json(['message' => 'Token de Google inválido.'], 422);
        }

        try {
            $datero = $googleAccountService->loginDatero($payload);
            $advisor = $datero->assignedAdvisor;
            $issuedToken = DateroApiToken::issueFor($datero, (string) $request->input('device_name', 'Datero'));
            $datero->forceFill(['last_login_at' => now()])->save();

            return response()->json([
                'token' => $issuedToken['plain_text_token'],
                'datero' => $this->dateroPayload($datero),
                'advisor' => $this->advisorPayload($advisor),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function register(
        GoogleRegisterRequest $request,
        GoogleIdTokenVerifier $verifier,
        GoogleAccountService $googleAccountService,
    ): JsonResponse {
        $payload = $this->verifyDateroToken($request->string('id_token')->toString(), $verifier);

        if ($payload === null) {
            return response()->json(['message' => 'Token de Google inválido.'], 422);
        }

        try {
            $datero = $googleAccountService->registerDatero($payload, [
                'dni' => $request->string('dni')->toString(),
                'phone' => $request->string('phone')->toString(),
                'city_id' => $request->integer('city_id'),
                'advisor_id' => $request->integer('advisor_id'),
            ]);

            $advisor = $datero->assignedAdvisor;
            $advisor?->notify(new DateroJoinedAdvisorNotification($datero));

            $issuedToken = DateroApiToken::issueFor($datero, (string) $request->input('device_name', 'Datero'));
            $datero->forceFill(['last_login_at' => now()])->save();

            return response()->json([
                'token' => $issuedToken['plain_text_token'],
                'datero' => $this->dateroPayload($datero),
                'advisor' => $advisor ? $this->advisorPayload($advisor) : null,
            ], 201);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    /**
     * @return array{sub: string, email: string, name: ?string, email_verified: bool}|null
     */
    private function verifyDateroToken(string $idToken, GoogleIdTokenVerifier $verifier): ?array
    {
        $audiences = array_values(array_filter([
            config('google.client_id'),
            config('google.mobile.datero.ios_client_id'),
            config('google.mobile.datero.android_client_id'),
        ]));

        foreach ($audiences as $audience) {
            try {
                return $verifier->verify($idToken, (string) $audience);
            } catch (InvalidArgumentException) {
                continue;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function dateroPayload(Datero $datero): array
    {
        return [
            'id' => $datero->id,
            'name' => $datero->name,
            'phone' => $datero->phone,
            'email' => $datero->email,
            'dni' => $datero->dni,
            'username' => $datero->username,
            'is_active' => $datero->is_active,
            'last_login_at' => $datero->last_login_at?->toIso8601String(),
            'registration_url' => $datero->registration_url,
            'registration_qr_url' => $datero->registration_qr_url,
            'city' => $datero->city ? [
                'id' => $datero->city->id,
                'name' => $datero->city->name,
                'department' => $datero->city->department,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function advisorPayload(Advisor $advisor): array
    {
        return [
            'id' => $advisor->id,
            'name' => $advisor->name,
            'phone' => $advisor->phone,
            'email' => $advisor->email,
            'username' => $advisor->username,
            'is_active' => $advisor->is_active,
            'team' => $advisor->team ? [
                'id' => $advisor->team->id,
                'name' => $advisor->team->name,
                'color' => $advisor->team->color,
            ] : null,
            'level' => $advisor->level ? [
                'id' => $advisor->level->id,
                'name' => $advisor->level->name,
                'code' => $advisor->level->code,
            ] : null,
        ];
    }
}
