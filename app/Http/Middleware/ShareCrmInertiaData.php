<?php

namespace App\Http\Middleware;

use App\Models\GoogleAccount;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Services\Crm\AdvisorCrmCatalogService;
use App\Services\Meta\MetaOAuthService;
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
        /** @var Advisor|null $advisor */
        $advisor = $request->user('advisor');

        if ($advisor) {
            app(AdvisorCrmCatalogService::class)->ensureDefaults($advisor);
        }

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

        Inertia::share('google', function () use ($request): array {
            /** @var Advisor|null $advisor */
            $advisor = $request->user('advisor');

            if (! $advisor) {
                return [
                    'connected' => false,
                    'calendar_connected' => false,
                ];
            }

            $account = GoogleAccount::query()->where('advisor_id', $advisor->id)->first();

            return [
                'connected' => $account !== null,
                'calendar_connected' => $account?->hasCalendarScope() && filled($account->refresh_token),
                'email' => $account?->email,
            ];
        });

        Inertia::share('meta', function () use ($request): array {
            /** @var Advisor|null $advisor */
            $advisor = $request->user('advisor');

            if (! $advisor) {
                return [
                    'connected' => false,
                    'whatsapp' => false,
                    'messenger' => false,
                    'instagram' => false,
                ];
            }

            return app(MetaOAuthService::class)->statusForAdvisor($advisor);
        });

        Inertia::share('pendingReminders', function () use ($request): array {
            /** @var Advisor|null $advisor */
            $advisor = $request->user('advisor');

            if (! $advisor) {
                return [
                    'count' => 0,
                    'items' => [],
                ];
            }

            $query = AdvisorReminder::query()
                ->where('advisor_id', $advisor->id)
                ->visibleForAdvisor()
                ->pending();

            $items = (clone $query)
                ->with('client:id,name')
                ->orderBy('remind_at')
                ->limit(8)
                ->get(['id', 'title', 'remind_at', 'client_id']);

            return [
                'count' => (clone $query)->count(),
                'items' => $items
                    ->map(fn (AdvisorReminder $reminder): array => [
                        'id' => $reminder->id,
                        'title' => $reminder->title,
                        'remind_at' => $reminder->remind_at?->toIso8601String(),
                        'client' => $reminder->client ? [
                            'id' => $reminder->client->id,
                            'name' => $reminder->client->name,
                        ] : null,
                    ])
                    ->all(),
            ];
        });

        return $next($request);
    }
}
