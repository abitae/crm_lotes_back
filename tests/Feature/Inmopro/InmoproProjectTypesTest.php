<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\ProjectType;
use App\Models\User;
use Database\Seeders\Inmopro\ProjectTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InmoproProjectTypesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(ProjectTypeSeeder::class);
    }

    public function test_authenticated_users_can_visit_project_types_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.project-types.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/project-types/index')
                ->has('projectTypes')
                ->has('filters')
                ->where('abilities.create', true)
                ->where('abilities.update', true)
                ->where('abilities.delete', true));
    }

    public function test_index_exposes_only_the_actions_allowed_by_the_users_permissions(): void
    {
        $user = User::factory()->create();
        $user->syncRoles([]);

        $permissions = collect([
            'inmopro.project-types.index',
            'inmopro.project-types.update',
        ])->map(fn (string $name) => Permission::findOrCreate($name, 'web'));

        $role = Role::firstOrCreate(
            ['name' => 'project-type-editor', 'guard_name' => 'web'],
            ['name' => 'project-type-editor', 'guard_name' => 'web'],
        );
        $role->syncPermissions($permissions);
        $user->assignRole($role);

        $this->actingAs($user)
            ->get(route('inmopro.project-types.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/project-types/index')
                ->where('abilities.create', false)
                ->where('abilities.update', true)
                ->where('abilities.delete', false));
    }

    public function test_authenticated_users_can_create_project_type(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.project-types.store'), [
                'name' => 'Industrial',
                'code' => 'INDUSTRIAL',
                'description' => 'Parques industriales',
                'color' => '#334155',
                'sort_order' => 9,
                'percentage_meta' => 100,
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.project-types.index'));

        $this->assertDatabaseHas('project_types', [
            'name' => 'Industrial',
            'code' => 'INDUSTRIAL',
        ]);
    }

    public function test_authenticated_users_can_update_project_type(): void
    {
        $user = User::factory()->create();
        $projectType = ProjectType::query()->firstOrFail();

        $this->actingAs($user)
            ->put(route('inmopro.project-types.update', $projectType), [
                'name' => 'Residencial Prime',
                'code' => $projectType->code,
                'description' => 'Actualizado',
                'color' => '#111827',
                'sort_order' => 3,
                'percentage_meta' => 50,
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.project-types.index'));

        $this->assertDatabaseHas('project_types', [
            'id' => $projectType->id,
            'name' => 'Residencial Prime',
            'percentage_meta' => 50,
        ]);
    }

    public function test_authenticated_users_can_delete_project_type(): void
    {
        $user = User::factory()->create();
        $projectType = ProjectType::query()->firstOrFail();

        $this->actingAs($user)
            ->delete(route('inmopro.project-types.destroy', $projectType))
            ->assertRedirect(route('inmopro.project-types.index'));

        $this->assertDatabaseMissing('project_types', ['id' => $projectType->id]);
    }

    public function test_project_types_routes_use_modal_workflow_without_create_edit_show_views(): void
    {
        $user = User::factory()->create();
        $projectType = ProjectType::query()->firstOrFail();

        $this->actingAs($user)->get('/inmopro/project-types/create')->assertStatus(405);
        $this->actingAs($user)->get("/inmopro/project-types/{$projectType->id}")->assertStatus(405);
        $this->actingAs($user)->get("/inmopro/project-types/{$projectType->id}/edit")->assertNotFound();
    }
}
