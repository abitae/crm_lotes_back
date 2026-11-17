<?php

namespace Tests\Feature\Inmopro;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InmoproTasksTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_super_admin_can_manage_tasks(): void
    {
        $admin = User::factory()->create();
        $assignee = User::factory()->create();

        $this->actingAs($admin)
            ->get(route('inmopro.tasks.index'))
            ->assertOk();

        $this->actingAs($admin)
            ->post(route('inmopro.tasks.store'), [
                'title' => 'Revisar contrato',
                'description' => 'Antes del viernes',
                'assigned_to' => $assignee->id,
            ])->assertRedirect(route('inmopro.tasks.index'));

        $task = Task::query()->where('title', 'Revisar contrato')->firstOrFail();
        $this->assertSame($admin->id, $task->created_by);

        $this->actingAs($admin)
            ->put(route('inmopro.tasks.update', $task), [
                'title' => 'Revisar escritura',
                'description' => 'Antes del viernes',
                'assigned_to' => $admin->id,
                'created_by' => $admin->id,
            ])->assertRedirect(route('inmopro.tasks.index'));

        $this->actingAs($admin)
            ->patch(route('inmopro.tasks.completion', $task), [
                'completed' => true,
            ])->assertRedirect(route('inmopro.tasks.index'));

        $this->assertNotNull($task->fresh()->completed_at);

        $this->actingAs($admin)
            ->delete(route('inmopro.tasks.destroy', $task))
            ->assertRedirect(route('inmopro.tasks.index'));

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_tasks_index_is_forbidden_without_permission(): void
    {
        Permission::findOrCreate('inmopro.tasks.index', 'web');
        $user = User::factory()->withoutSuperAdmin()->create();

        $this->actingAs($user)
            ->get(route('inmopro.tasks.index'))
            ->assertForbidden();
    }

    public function test_user_with_index_permission_can_open_the_module(): void
    {
        Permission::findOrCreate('inmopro.tasks.index', 'web');
        $user = User::factory()->withoutSuperAdmin()->create();
        $user->givePermissionTo('inmopro.tasks.index');

        $this->actingAs($user)
            ->get(route('inmopro.tasks.index'))
            ->assertOk();
    }
}
