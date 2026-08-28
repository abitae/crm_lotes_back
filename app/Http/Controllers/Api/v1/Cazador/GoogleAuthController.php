<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Contracts\Google\GoogleIdTokenVerifier;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\GoogleLoginRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorApiToken;
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
        $audiences = array_values(array_filter([
            config('google.client_id'),
            config('google.mobile.cazador.ios_client_id'),
            config('google.mobile.cazador.android_client_id'),
        ]));

        $payload = null;
        $lastError = null;

        foreach ($audiences as $audience) {
            try {
                $payload = $verifier->verify($request->string('id_token')->toString(), (string) $audience);
                break;
            } catch (InvalidArgumentException $exception) {
                $lastError = $exception;
            }
        }

        if ($payload === null) {
            return response()->json([
                'message' => $lastError?->getMessage() ?? 'Token de Google inválido.',
            ], 422);
        }

        try {
            /** @var Advisor $advisor */
            $advisor = $googleAccountService->linkAdvisorFromToken($payload);
            $issuedToken = AdvisorApiToken::issueFor($advisor, (string) $request->input('device_name', 'Cazador'));
            $advisor->forceFill(['last_login_at' => now()])->save();

            return response()->json([
                'token' => $issuedToken['plain_text_token'],
                'advisor' => $this->advisorPayload($advisor),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function advisorPayload(Advisor $advisor): array
    {
        return [
            'id' => $advisor->id,
            'name' => $advisor->name,
            'first_name' => $advisor->first_name,
            'last_name' => $advisor->last_name,
            'birth_date' => $advisor->birth_date?->toDateString(),
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
