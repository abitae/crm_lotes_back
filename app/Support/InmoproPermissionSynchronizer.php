<?php

namespace App\Support;

use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

final class InmoproPermissionSynchronizer
{
    /** @var list<string> */
    private const EXTRA_PERMISSION_NAMES = [
        'inmopro.project-360.manage',
    ];

    /**
     * Assign every permission on guard "web" to the "super-admin" role.
     *
     * Keeps the role aligned when new route permissions are synced or when
     * extra web permissions exist in the database.
     */
    public static function grantAllWebPermissionsToSuperAdmin(): void
    {
        $superAdmin = Role::findOrCreate('super-admin', 'web');
        $permissions = Permission::query()->where('guard_name', 'web')->get();
        $superAdmin->syncPermissions($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Create missing Permission rows for every named route starting with "inmopro.".
     *
     * @return int Number of permission names processed (including existing).
     */
    public static function syncFromRoutes(): int
    {
        $processed = 0;

        foreach (Route::getRoutes() as $route) {
            $name = $route->getName();
            if (! is_string($name) || ! str_starts_with($name, 'inmopro.')) {
                continue;
            }

            Permission::findOrCreate($name, 'web');
            $processed++;
        }

        foreach (self::EXTRA_PERMISSION_NAMES as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
            $processed++;
        }

        self::grantAllWebPermissionsToSuperAdmin();

        return $processed;
    }
}
