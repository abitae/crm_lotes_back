<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmProjectsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_index_only_lists_active_projects(): void
    {
        $advisor = Advisor::firstOrFail();
        $activeCount = Project::query()->where('is_active', true)->count();
        Project::query()->where('is_active', true)->first()?->update(['is_active' => false]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.projects.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('projects', $activeCount - 1));
    }

    public function test_show_lists_lots_for_the_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $libreId = LotStatus::where('code', 'LIBRE')->value('id');

        Lot::create([
            'project_id' => $project->id, 'block' => 'Z', 'number' => '1',
            'area' => 100, 'price' => 30000, 'lot_status_id' => $libreId,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.projects.show', $project))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('project.id', $project->id));
    }

    public function test_show_returns_404_for_inactive_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $project->update(['is_active' => false]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.projects.show', $project))->assertNotFound();
    }
}
