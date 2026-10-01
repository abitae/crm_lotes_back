<?php

namespace App\Http\Controllers\Inmopro\AccessControl;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\AccessControl\StoreAccessControlUserRequest;
use App\Http\Requests\Inmopro\AccessControl\UpdateUserRolesRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserRolesController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));

        $users = User::query()
            ->with('roles:id,name')
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($inner) use ($search): void {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('inmopro/access-control/users/index', [
            'users' => $users,
            'roles' => Role::query()->where('guard_name', 'web')->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('search'),
            'openCreate' => $request->query('create') === '1',
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.access-control.users.index', ['create' => 1]);
    }

    public function store(StoreAccessControlUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $roleIds = $validated['role_ids'] ?? [];

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'email_verified_at' => now(),
        ]);

        if ($roleIds !== []) {
            $roles = Role::query()
                ->whereIn('id', $roleIds)
                ->where('guard_name', 'web')
                ->get();
            $user->syncRoles($roles);
        }

        return redirect()->route('inmopro.access-control.users.index')
            ->with('success', 'Usuario creado. Puede iniciar sesión con el correo y la contraseña indicados.');
    }

    public function edit(User $user): Response
    {
        $roles = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        $user->load('roles');

        return Inertia::render('inmopro/access-control/users/roles', [
            'targetUser' => $user,
            'roles' => $roles,
            'assignedRoleIds' => $user->roles->pluck('id')->all(),
        ]);
    }

    public function update(UpdateUserRolesRequest $request, User $user): RedirectResponse
    {
        $roleIds = $request->validated('role_ids');
        $roles = Role::query()->whereIn('id', $roleIds)->where('guard_name', 'web')->get();

        if ($user->is($request->user()) && ! $roles->contains('name', 'super-admin')) {
            abort(422, 'No puede quitarse el rol super-admin a sí mismo.');
        }

        $user->syncRoles($roles);

        return redirect()->route('inmopro.access-control.users.index')
            ->with('success', 'Roles del usuario actualizados.');
    }
}
