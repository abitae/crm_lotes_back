<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
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

    public function test_advisor_toggle_active_flips_status(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $advisor = Advisor::query()->firstOrFail();
        $advisor->update(['is_active' => true]);

        $this->from(route('inmopro.advisors.index'))
            ->patch(route('inmopro.advisors.toggle-active', $advisor))
            ->assertRedirect(route('inmopro.advisors.index'))
            ->assertSessionHas('success', 'Vendedor desactivado correctamente.');

        $this->assertFalse($advisor->fresh()->is_active);

        $this->from(route('inmopro.advisors.index'))
            ->patch(route('inmopro.advisors.toggle-active', $advisor))
            ->assertRedirect(route('inmopro.advisors.index'))
            ->assertSessionHas('success', 'Vendedor activado correctamente.');

        $this->assertTrue($advisor->fresh()->is_active);
    }

    public function test_financial_index_uses_current_month_date_defaults(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('inmopro.financial.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/financial')
                ->where('filters.start_date', now()->startOfMonth()->toDateString())
                ->where('filters.end_date', now()->toDateString()));
    }

    public function test_inactive_projects_are_hidden_from_lots_financial_and_receivables(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $typeId = ProjectType::query()->value('id');
        $reservedStatusId = LotStatus::query()->where('code', 'RESERVADO')->value('id')
            ?? LotStatus::query()->value('id');

        $activeProject = Project::query()->create([
            'name' => 'Proyecto Activo Lotes',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'is_active' => true,
        ]);

        $inactiveProject = Project::query()->create([
            'name' => 'Proyecto Inactivo Lotes',
            'project_type_id' => $typeId,
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['B'],
            'is_active' => false,
        ]);

        Lot::query()->create([
            'project_id' => $activeProject->id,
            'block' => 'A',
            'number' => 1,
            'area' => 100,
            'price' => 100000,
            'lot_status_id' => $reservedStatusId,
            'contract_date' => now()->toDateString(),
        ]);

        Lot::query()->create([
            'project_id' => $inactiveProject->id,
            'block' => 'B',
            'number' => 1,
            'area' => 100,
            'price' => 200000,
            'lot_status_id' => $reservedStatusId,
            'contract_date' => now()->toDateString(),
        ]);

        $assertOnlyActiveProject = fn ($page) => $page
            ->has('projects', 1)
            ->where('projects.0.id', $activeProject->id)
            ->where('projects.0.name', 'Proyecto Activo Lotes');

        $this->get(route('inmopro.lots.index', ['project_id' => $inactiveProject->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $assertOnlyActiveProject($page)
                ->where('project.id', $activeProject->id));

        $this->get(route('inmopro.financial.index', [
            'start_date' => '2000-01-01',
            'end_date' => now()->toDateString(),
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $assertOnlyActiveProject($page)
                ->where('filters.start_date', '2000-01-01')
                ->has('lots.data', 1)
                ->where('lots.data.0.project.id', $activeProject->id));

        $this->get(route('inmopro.accounts-receivable.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $assertOnlyActiveProject($page)
                ->has('lots.data', 1)
                ->where('lots.data.0.project.id', $activeProject->id));

        $this->get(route('inmopro.lot-pre-reservations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $assertOnlyActiveProject($page));
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
