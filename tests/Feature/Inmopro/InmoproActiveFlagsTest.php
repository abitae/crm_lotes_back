<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectType;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproActiveFlagsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectTypeSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_projects_index_can_filter_inactive_only(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $typeId = ProjectType::query()->value('id');

        Project::query()->create([
            'name' => 'Proyecto Activo',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 10,
            'blocks' => ['A'],
            'is_active' => true,
        ]);

        Project::query()->create([
            'name' => 'Proyecto Inactivo',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 5,
            'blocks' => ['B'],
            'is_active' => false,
        ]);

        $this->get(route('inmopro.projects.index', ['is_active' => '0']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/projects/index')
                ->where('projects.data.0.name', 'Proyecto Inactivo')
                ->where('projects.data.0.is_active', false)
                ->has('projects.data', 1));
    }

    public function test_dashboard_chart_data_only_includes_active_projects(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $typeId = ProjectType::query()->value('id');

        Project::query()->create([
            'name' => 'Visible En Dashboard',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'is_active' => true,
        ]);

        Project::query()->create([
            'name' => 'Oculto En Dashboard',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['B'],
            'is_active' => false,
        ]);

        $this->get(route('inmopro.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/dashboard')
                ->has('chartData', 1)
                ->where('chartData.0.name', 'Visible En Dashboard'));
    }

    public function test_project_toggle_active_flips_status(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $typeId = ProjectType::query()->value('id');

        $project = Project::query()->create([
            'name' => 'Proyecto Toggle',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'is_active' => true,
        ]);

        $this->from(route('inmopro.projects.show', $project))
            ->patch(route('inmopro.projects.toggle-active', $project))
            ->assertRedirect(route('inmopro.projects.show', $project))
            ->assertSessionHas('success', 'Proyecto desactivado correctamente.');

        $this->assertFalse($project->fresh()->is_active);

        $this->from(route('inmopro.projects.index'))
            ->patch(route('inmopro.projects.toggle-active', $project))
            ->assertRedirect(route('inmopro.projects.index'))
            ->assertSessionHas('success', 'Proyecto activado correctamente.');

        $this->assertTrue($project->fresh()->is_active);
    }

    public function test_advisors_index_can_filter_inactive_only(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $active = Advisor::query()->firstOrFail();
        $active->update(['is_active' => true, 'name' => 'Vendedor Activo Test']);

        $inactive = Advisor::query()->whereKeyNot($active->id)->firstOrFail();
        $inactive->update(['is_active' => false, 'name' => 'Vendedor Inactivo Test']);

        $response = $this->get(route('inmopro.advisors.index', ['is_active' => '0']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/advisors/index')
            ->has('advisors.data', 1)
            ->where('advisors.data', function ($rows) use ($inactive): bool {
                return count($rows) === 1
                    && $rows[0]['id'] === $inactive->id
                    && $rows[0]['is_active'] === false;
            }));
    }
}
