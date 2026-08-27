<?php

namespace App\Http\Middleware;

use App\Models\Inmopro\Advisor;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ShareCrmInertiaData
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        Inertia::share('auth.advisor', function () use ($request): ?array {
            /** @var Advisor|null $advisor */
            $advisor = $request->user('advisor');

            if (! $advisor) {
                return null;
            }

            return [
                'id' => $advisor->id,
                'name' => $advisor->name,
                'username' => $advisor->username,
                'email' => $advisor->email,
                'phone' => $advisor->phone,
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
        });

        return $next($request);
    }
}
