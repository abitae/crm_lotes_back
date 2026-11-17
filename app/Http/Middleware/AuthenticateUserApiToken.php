<?php

namespace App\Http\Middleware;

use App\Models\UserApiToken;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateUserApiToken
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->bearerToken();

        if (! $header) {
            return $this->unauthorizedResponse();
        }

        $token = UserApiToken::query()
            ->with('user')
            ->where('token', hash('sha256', $header))
            ->first();

        if (! $token || ($token->expires_at !== null && $token->expires_at->isPast()) || ! $token->user) {
            return $this->unauthorizedResponse();
        }

        $token->forceFill(['last_used_at' => now()])->save();
        Auth::setUser($token->user);
        $request->setUserResolver(fn () => $token->user);
        $request->attributes->set('user_api_token', $token);

        return $next($request);
    }

    private function unauthorizedResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'No autenticado.',
        ], 401);
    }
}
