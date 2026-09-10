<?php

namespace App\Http\Middleware;

use App\Services\Inmopro\InmoproAuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RecordInmoproAudit
{
    public function __construct(
        private InmoproAuditLogger $auditLogger,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->shouldRecord($request, $response)) {
            try {
                $this->auditLogger->record($request);
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return $response;
    }

    private function shouldRecord(Request $request, Response $response): bool
    {
        if ($response->getStatusCode() >= 400) {
            return false;
        }

        $name = $request->route()?->getName();
        if (! is_string($name) || ! str_starts_with($name, 'inmopro.')) {
            return false;
        }

        if (str_starts_with($name, 'inmopro.audit')) {
            return false;
        }

        if (str_ends_with($name, '.search') || str_contains($name, 'duplicates')) {
            return false;
        }

        $method = strtoupper($request->method());

        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return true;
        }

        if ($method === 'GET') {
            if (str_contains($name, 'export')) {
                return true;
            }

            return $name === 'inmopro.clients.show';
        }

        return false;
    }
}
