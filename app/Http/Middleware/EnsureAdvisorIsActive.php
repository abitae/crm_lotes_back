<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdvisorIsActive
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $advisor = $request->user('advisor');

        if ($advisor && ! $advisor->is_active) {
            Auth::guard('advisor')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return $this->redirectToLogin();
        }

        return $next($request);
    }

    private function redirectToLogin(): RedirectResponse
    {
        return redirect()->route('crm.login')->withErrors([
            'username' => 'Tu acceso ha sido desactivado. Contacta a un administrador.',
        ]);
    }
}
