<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\InmoproAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class InmoproAuditLogger
{
    public function record(Request $request): void
    {
        $routeName = $request->route()?->getName();
        if (! is_string($routeName)) {
            $routeName = null;
        }

        [$subjectType, $subjectId] = $this->subjectFromRequest($request);

        /** @var User|null $user */
        $user = $request->user();

        InmoproAuditLog::query()->create([
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'action' => $this->actionFromRoute($routeName),
            'method' => strtoupper($request->method()),
            'route_name' => $routeName,
            'url' => $request->fullUrl(),
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'meta' => [
                'query' => $request->query(),
            ],
            'created_at' => now(),
        ]);
    }

    public function actionFromRoute(?string $routeName): string
    {
        if ($routeName === null || $routeName === '') {
            return 'unknown';
        }

        $short = str_starts_with($routeName, 'inmopro.')
            ? substr($routeName, strlen('inmopro.'))
            : $routeName;

        if (str_contains($short, 'export')) {
            $resource = explode('.', $short)[0] ?? $short;

            return $resource.'.exported';
        }

        return match (true) {
            str_ends_with($short, '.show') => substr($short, 0, -5).'.viewed',
            str_ends_with($short, '.store') => substr($short, 0, -6).'.created',
            str_ends_with($short, '.update') => substr($short, 0, -7).'.updated',
            str_ends_with($short, '.destroy') => substr($short, 0, -8).'.deleted',
            default => $short,
        };
    }

    /**
     * @return array{0: string|null, 1: int|null}
     */
    private function subjectFromRequest(Request $request): array
    {
        foreach (['client', 'lot', 'project'] as $key) {
            $param = $request->route($key);
            if ($param instanceof Model) {
                $id = $param->getKey();

                return [
                    $param::class,
                    is_numeric($id) ? (int) $id : null,
                ];
            }
        }

        return [null, null];
    }
}
