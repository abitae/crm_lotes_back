<?php

namespace Tests\Feature\Inmopro;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InmoproAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_super_admin_cannot_open_access_control_roles(): void
    {
        $user = User::factory()->create();
        $user->syncRoles([]);

        $this->actingAs($user)
            ->get(route('inmopro.access-control.roles.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_open_access_control_roles(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.access-control.roles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/access-control/roles/index'));
    }

    public function test_non_super_admin_cannot_open_access_control_users_create(): void
    {
        $user = User::factory()->create();
        $user->syncRoles([]);

        $this->actingAs($user)
            ->get(route('inmopro.access-control.users.create'))
            ->assertForbidden();
    }

    public function test_super_admin_can_open_access_control_users_create(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.access-control.users.create'))
            ->assertRedirect(route('inmopro.access-control.users.index', ['create' => 1]));
    }

    public function test_super_admin_can_store_user_from_access_control(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)
            ->post(route('inmopro.access-control.users.store'), [
                'name' => 'Nuevo Panel',
                'email' => 'nuevo.panel@example.test',
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertRedirect(route('inmopro.access-control.users.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'nuevo.panel@example.test',
            'name' => 'Nuevo Panel',
        ]);

        $created = User::query()->where('email', 'nuevo.panel@example.test')->firstOrFail();
        $this->assertNotNull($created->email_verified_at);
    }

    public function test_super_admin_can_store_user_with_roles_from_access_control(): void
    {
        $admin = User::factory()->create();
        $role = Role::query()->create(['name' => 'test-viewer-ac', 'guard_name' => 'web']);

        $this->actingAs($admin)
            ->post(route('inmopro.access-control.users.store'), [
                'name' => 'Con Rol',
                'email' => 'con.rol@example.test',
                'password' => 'password',
                'password_confirmation' => 'password',
                'role_ids' => [$role->id],
            ])
            ->assertRedirect(route('inmopro.access-control.users.index'));

        $created = User::query()->where('email', 'con.rol@example.test')->firstOrFail();
        $this->assertTrue($created->hasRole('test-viewer-ac'));
    }

    public function test_non_super_admin_cannot_store_user_from_access_control(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles([]);

        $this->actingAs($actor)
            ->post(route('inmopro.access-control.users.store'), [
                'name' => 'Hack',
                'email' => 'hack@example.test',
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertForbidden();
    }

    public function test_store_user_from_access_control_requires_unique_email(): void
    {
        $admin = User::factory()->create();
        $existing = User::factory()->create(['email' => 'exists@example.test']);

        $this->actingAs($admin)
            ->post(route('inmopro.access-control.users.store'), [
                'name' => 'Dup',
                'email' => $existing->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertSessionHasErrors('email');
    }
}
