<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureInmoproRoutePermission
{
    /**
     * Routes that inherit authorization from another inmopro.* permission.
     *
     * @var array<string, string>
     */
    private const ROUTE_PERMISSION_ALIASES = [
        'inmopro.lot-transfer-confirmations.export-excel' => 'inmopro.lot-transfer-confirmations.index',
        'inmopro.lot-transfer-confirmations.evidence' => 'inmopro.lot-transfer-confirmations.index',
        'inmopro.lot-pre-reservations.voucher' => 'inmopro.lot-pre-reservations.index',
        'inmopro.lots.transfer-queue-notes.update' => 'inmopro.lot-transfer-confirmations.index',
        'inmopro.project-360.show' => 'inmopro.project-360.index',
        'inmopro.project-360.panoramas.store' => 'inmopro.project-360.manage',
        'inmopro.project-360.panoramas.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.start-panorama.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.panoramas.destroy' => 'inmopro.project-360.manage',
        'inmopro.project-360.settings.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.scene-settings.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.hotspots.store' => 'inmopro.project-360.manage',
        'inmopro.project-360.hotspots.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.hotspots.destroy' => 'inmopro.project-360.manage',
        'inmopro.project-360.labels.store' => 'inmopro.project-360.manage',
        'inmopro.project-360.labels.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.labels.destroy' => 'inmopro.project-360.manage',
        'inmopro.project-360.polygons.store' => 'inmopro.project-360.manage',
        'inmopro.project-360.polygons.update' => 'inmopro.project-360.manage',
        'inmopro.project-360.polygons.destroy' => 'inmopro.project-360.manage',
        'inmopro.project-360.share-links.store' => 'inmopro.project-360.manage',
        'inmopro.project-360.share-links.revoke' => 'inmopro.project-360.manage',
        'inmopro.project-flat.show' => 'inmopro.project-flat.index',
        'inmopro.project-flat.polygons.store' => 'inmopro.project-flat.manage',
        'inmopro.project-flat.polygons.update' => 'inmopro.project-flat.manage',
        'inmopro.project-flat.polygons.destroy' => 'inmopro.project-flat.manage',
        'inmopro.projects.inventory' => 'inmopro.projects.show',
    ];

    /**
     * Require the authenticated user to have a Spatie permission whose name
     * matches the current route name (inmopro.*), except access-control routes.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $name = $request->route()?->getName();

        if (! is_string($name) || ! str_starts_with($name, 'inmopro.')) {
            return $next($request);
        }

        if (str_starts_with($name, 'inmopro.access-control.')) {
            return $next($request);
        }

        $permission = self::ROUTE_PERMISSION_ALIASES[$name] ?? $name;

        abort_unless($user && $user->can($permission), 403);

        return $next($request);
    }
}
