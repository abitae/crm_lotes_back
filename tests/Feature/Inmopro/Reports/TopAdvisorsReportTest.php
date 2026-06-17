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

class TopAdvisorsReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_top_advisors_includes_transferred_lots_by_notarial_transfer_date(): void
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
        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 30000,
            'lot_status_id' => $status->id,
            'contract_date' => '2026-02-01',
            'notarial_transfer_date' => '2026-03-10',
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
                ->where('rows.0.transfer_count', 1)
                ->where('rows.0.transfer_amount', 30000));
    }

    public function test_top_advisors_sold_amount_uses_lot_price_without_percentage_meta(): void
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
            'notarial_transfer_date' => '2026-03-12',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.top-advisors.index', [
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.sold_amount', 40000)
                ->missing('criteriaNote'));
    }

    public function test_top_advisors_only_counts_transferred_lots_with_notarial_date_in_range(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $reservedStatus = LotStatus::create(['name' => 'Reservado', 'code' => 'RESERVADO', 'color' => '#f59e0b', 'sort_order' => 1]);
        $transferredStatus = LotStatus::create(['name' => 'Transferido', 'code' => 'TRANSFERIDO', 'color' => '#64748b', 'sort_order' => 2]);
        $team = Team::create(['name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000', 'sort_order' => 1, 'is_active' => true]);
        $level = AdvisorLevel::create(['name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2, 'color' => '#000', 'sort_order' => 1]);
        $city = City::create(['name' => 'Lima', 'code' => 'LIM', 'department' => 'Lima', 'sort_order' => 1, 'is_active' => true]);
        $advisor = Advisor::create([
            'dni' => '87654323', 'name' => 'Asesor Estados', 'phone' => '999', 'email' => 'estados@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 0,
        ]);
        $project = Project::create(['name' => 'P Estados', 'location' => 'X', 'total_lots' => 10, 'blocks' => ['A']]);
        $user = User::factory()->create();

        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $reservedStatus->id,
            'contract_date' => '2026-03-05',
            'notarial_transfer_date' => '2026-03-08',
        ]);

        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '2',
            'area' => 100,
            'price' => 20000,
            'lot_status_id' => $transferredStatus->id,
            'contract_date' => '2026-03-06',
            'notarial_transfer_date' => '2026-03-10',
        ]);

        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '3',
            'area' => 100,
            'price' => 50000,
            'lot_status_id' => $transferredStatus->id,
            'contract_date' => '2026-03-06',
            'notarial_transfer_date' => '2026-04-05',
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.reports.top-advisors.index', [
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.advisor_name', 'Asesor Estados')
                ->where('rows.0.sold_amount', 20000)
                ->where('rows.0.transfer_count', 1)
                ->where('rows.0.transfer_amount', 20000));
    }
}
