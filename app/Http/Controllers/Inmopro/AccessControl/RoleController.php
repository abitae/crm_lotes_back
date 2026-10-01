<?php

namespace App\Http\Controllers\Inmopro\AccessControl;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\AccessControl\StoreRoleRequest;
use App\Http\Requests\Inmopro\AccessControl\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->withCount('permissions')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('inmopro/access-control/roles/index', [
            'roles' => $roles,
            'filters' => $request->only('search'),
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.access-control.roles.index', ['create' => 1]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        Role::create([
            'name' => $request->validated('name'),
            'guard_name' => 'web',
        ]);

        return redirect()->route('inmopro.access-control.roles.index')
            ->with('success', 'Rol creado.');
    }

    public function edit(Role $role): Response
    {
        abort_unless($role->guard_name === 'web', 404);

        return Inertia::render('inmopro/access-control/roles/edit', [
            'role' => $role,
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        abort_unless($role->guard_name === 'web', 404);

        if ($role->name === 'super-admin' && $request->validated('name') !== 'super-admin') {
            abort(422, 'No se puede renombrar el rol super-admin.');
        }

        $role->update(['name' => $request->validated('name')]);

        return redirect()->route('inmopro.access-control.roles.index')
            ->with('success', 'Rol actualizado.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_unless($role->guard_name === 'web', 404);

        if ($role->name === 'super-admin') {
            abort(422, 'No se puede eliminar el rol super-admin.');
        }

        $role->delete();

        return redirect()->route('inmopro.access-control.roles.index')
            ->with('success', 'Rol eliminado.');
    }
}
