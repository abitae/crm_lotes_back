<?php

namespace Tests\Feature\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectType;
use App\Models\Inmopro\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TopAdvisorsReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_top_advisors_includes_sales_and_transfer_counts(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $status = LotStatus::create(['name' => 'Transferido', 'code' => 'TRANSFERIDO', 'color' => '#64748b', 'sort_order' => 2]);
        $team = Team::create(['name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000', 'sort_order' => 1, 'is_active' => true]);
        $level = AdvisorLevel::create(['name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2, 'color' => '#000', 'sort_order' => 1]);
        $city = City::create(['name' => 'Lima', 'code' => 'LIM', 'department' => 'Lima', 'sort_order' => 1, 'is_active' => true]);
        $advisor = Advisor::create([
            'dni' => '87654321', 'name' => 'Top Asesor', 'phone' => '999', 'email' => 'top@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 0,
        ]);
        $project = Project::create(['name' => 'P1', 'location' => 'X', 'total_lots' => 10, 'blocks' => ['A']]);
        $user = User::factory()->create();
        $lot = Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 30000,
            'lot_status_id' => $status->id,
            'contract_date' => '2026-03-05',
        ]);
        LotTransferConfirmation::create([
            'lot_id' => $lot->id,
            'status' => LotTransferConfirmation::STATUS_APPROVED,
            'evidence_path' => 'evidence/test.jpg',
            'requested_by' => $user->id,
            'reviewed_by' => $user->id,
            'reviewed_at' => '2026-03-10 10:00:00',
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.reports.top-advisors.index', [
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/top-advisors')
                ->where('rows.0.advisor_name', 'Top Asesor')
                ->where('rows.0.sold_amount', 30000)
                ->where('rows.0.transfer_count', 1));
    }

    public function test_top_advisors_sold_amount_respects_percentage_meta(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $status = LotStatus::create(['name' => 'Transferido', 'code' => 'TRANSFERIDO', 'color' => '#64748b', 'sort_order' => 2]);
        $type = ProjectType::create([
            'name' => 'Mitad', 'code' => 'MITAD', 'description' => null, 'color' => '#000',
            'sort_order' => 1, 'percentage_meta' => 50, 'is_active' => true,
        ]);
        $team = Team::create(['name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000', 'sort_order' => 1, 'is_active' => true]);
        $level = AdvisorLevel::create(['name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2, 'color' => '#000', 'sort_order' => 1]);
        $city = City::create(['name' => 'Lima', 'code' => 'LIM', 'department' => 'Lima', 'sort_order' => 1, 'is_active' => true]);
        $advisor = Advisor::create([
            'dni' => '87654322', 'name' => 'Asesor Meta', 'phone' => '999', 'email' => 'meta@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 0,
        ]);
        $project = Project::create([
            'name' => 'P Meta', 'project_type_id' => $type->id, 'location' => 'X', 'total_lots' => 10, 'blocks' => ['A'],
        ]);
        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 40000,
            'lot_status_id' => $status->id,
            'contract_date' => '2026-03-05',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.top-advisors.index', [
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.sold_amount', 20000));
    }
}
