<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproProjectShowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
    }

    public function test_project_show_orders_lots_by_block_then_number(): void
    {
        $user = User::factory()->create();
        $project = Project::query()->firstOrFail();
        $libreId = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->value('id');

        $project->lots()->delete();

        Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'B',
            'number' => '2',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $libreId,
        ]);
        Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '10',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $libreId,
        ]);
        Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '1A',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $libreId,
        ]);
        Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '2',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $libreId,
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.projects.show', $project))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/projects/show')
                ->has('project.lots', 4)
                ->where('project.lots.0.block', 'A')
                ->where('project.lots.0.number', '1A')
                ->where('project.lots.1.block', 'A')
                ->where('project.lots.1.number', '2')
                ->where('project.lots.2.block', 'A')
                ->where('project.lots.2.number', '10')
                ->where('project.lots.3.block', 'B')
                ->where('project.lots.3.number', '2'));
    }

    public function test_project_inventory_page_renders_lots(): void
    {
        $user = User::factory()->create();
        $project = Project::query()->firstOrFail();
        $libreId = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->value('id');

        $project->lots()->delete();

        Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $libreId,
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.projects.inventory', $project))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/projects/inventory')
                ->has('project.lots', 1)
                ->where('project.lots.0.block', 'A')
                ->where('project.lots.0.number', '1')
                ->has('lotStatuses'));
    }
}
