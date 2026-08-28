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

class CrmLotsTest extends TestCase
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

    public function test_index_mine_paginates_lots_instead_of_returning_everything(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $libreId = LotStatus::where('code', 'LIBRE')->value('id');

        for ($i = 1; $i <= 25; $i++) {
            Lot::create([
                'project_id' => $project->id,
                'block' => 'A',
                'number' => (string) (100 + $i),
                'area' => 100,
                'price' => 30000,
                'lot_status_id' => $libreId,
                'advisor_id' => $advisor->id,
            ]);
        }

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.lots.mine'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('lots.data', 20)
                ->has('lots.links'));
    }

    public function test_index_mine_only_lists_own_lots(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $libreId = LotStatus::where('code', 'LIBRE')->value('id');

        Lot::create([
            'project_id' => $project->id, 'block' => 'B', 'number' => '1',
            'area' => 100, 'price' => 30000, 'lot_status_id' => $libreId, 'advisor_id' => $advisor->id,
        ]);
        Lot::create([
            'project_id' => $project->id, 'block' => 'B', 'number' => '2',
            'area' => 100, 'price' => 30000, 'lot_status_id' => $libreId, 'advisor_id' => $otherAdvisor->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.lots.mine'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('lots.data', 1));
    }

    public function test_show_returns_404_for_lot_in_inactive_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $project->update(['is_active' => false]);
        $libreId = LotStatus::where('code', 'LIBRE')->value('id');

        $lot = Lot::create([
            'project_id' => $project->id, 'block' => 'C', 'number' => '1',
            'area' => 100, 'price' => 30000, 'lot_status_id' => $libreId,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.lots.show', $lot))->assertNotFound();
    }

    public function test_show_marks_lot_pre_reservable_only_when_libre(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $libreId = LotStatus::where('code', 'LIBRE')->value('id');

        $lot = Lot::create([
            'project_id' => $project->id, 'block' => 'D', 'number' => '1',
            'area' => 100, 'price' => 30000, 'lot_status_id' => $libreId,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.lots.show', $lot))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('lot.can_pre_reserve', true));
    }
}
