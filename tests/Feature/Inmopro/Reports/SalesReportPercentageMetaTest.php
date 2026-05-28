<?php

namespace Tests\Feature\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectType;
use App\Models\Inmopro\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SalesReportPercentageMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_sold_amount_uses_project_type_percentage_meta(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));

        $type = ProjectType::create([
            'name' => 'Parcial',
            'code' => 'PARCIAL',
            'description' => '50% meta',
            'color' => '#000',
            'sort_order' => 1,
            'percentage_meta' => 50,
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000',
            'sort_order' => 1, 'is_active' => true,
        ]);
        $level = AdvisorLevel::create([
            'name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2,
            'color' => '#000', 'sort_order' => 1,
        ]);
        $city = City::create([
            'name' => 'Lima', 'code' => 'LIM', 'department' => 'Lima', 'sort_order' => 1, 'is_active' => true,
        ]);
        $advisor = Advisor::create([
            'dni' => '11111111', 'name' => 'Asesor', 'phone' => '999', 'email' => 'a@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 80000,
        ]);
        $project = Project::create([
            'name' => 'Proyecto Meta',
            'project_type_id' => $type->id,
            'location' => 'X',
            'total_lots' => 10,
            'blocks' => ['A'],
        ]);
        $status = LotStatus::create([
            'name' => 'Transferido', 'code' => 'TRANSFERIDO', 'color' => '#64748b', 'sort_order' => 2,
        ]);
        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 20000,
            'lot_status_id' => $status->id,
            'contract_date' => '2026-03-10',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'projects']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.sold_amount', 10000)
                ->where('rows.0.goal_amount', 80000));

        $type->update(['percentage_meta' => 0]);

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'projects']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.sold_amount', 0)
                ->where('rows.0.goal_amount', 80000));
    }
}
