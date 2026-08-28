<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdvisorPinIsCurrent
{
    /**
     * Routes an advisor with a pending mandatory PIN change is still allowed to reach:
     * the profile screen (to change it), the PIN-update endpoint itself, and logout.
     *
     * @var list<string>
     */
    private const ALLOWED_ROUTE_NAMES = [
        'crm.profile.edit',
        'crm.profile.update',
        'crm.profile.pin.update',
        'crm.logout',
    ];

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $advisor = $request->user('advisor');

        if ($advisor && $advisor->must_change_pin && ! in_array($request->route()?->getName(), self::ALLOWED_ROUTE_NAMES, true)) {
            return redirect()->route('crm.profile.edit')->with(
                'error',
                'Debes establecer un nuevo PIN antes de continuar.',
            );
        }

        return $next($request);
    }
}
