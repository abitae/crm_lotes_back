<?php

namespace App\Http\Middleware;

use App\Support\AppBrandingResolver;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => AppBrandingResolver::resolvedDisplayName(),
            'brandingLogoUrl' => AppBrandingResolver::logoUrl(),
            'brandingTagline' => AppBrandingResolver::tagline(),
            'brandingPrimaryColor' => AppBrandingResolver::primaryColorHex(),
            'auth' => [
                'user' => fn () => $request->user('web')
                    ? [
                        ...$request->user('web')->only([
                            'id',
                            'name',
                            'email',
                            'email_verified_at',
                            'created_at',
                            'updated_at',
                        ]),
                        'avatar' => null,
                        'two_factor_enabled' => $request->user('web')->two_factor_secret !== null,
                        'permissions' => $request->user('web')->permissionNamesForFrontend(),
                        'roles' => $request->user('web')->getRoleNames()->values()->all(),
                    ]
                    : null,
            ],
            'sidebarOpen' => $request->hasCookie('sidebar_state')
                ? $request->cookie('sidebar_state') === 'true'
                : ! $request->is('crm', 'crm/*'),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
