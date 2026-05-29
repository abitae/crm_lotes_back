<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOpenAiCazadorEnabled
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('openai_cazador.enabled')) {
            abort(503, 'El asistente de catálogo no está disponible en este momento.');
        }

        return $next($request);
    }
}
