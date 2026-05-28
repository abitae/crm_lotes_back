<?php

namespace Tests\Feature\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReservationsReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservations_detail_lists_reserved_lots_in_date_range(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $reserved = LotStatus::create(['name' => 'Reservado', 'code' => 'RESERVADO', 'color' => '#f59e0b', 'sort_order' => 1]);
        $team = Team::create(['name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000', 'sort_order' => 1, 'is_active' => true]);
        $level = AdvisorLevel::create(['name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2, 'color' => '#000', 'sort_order' => 1]);
        $city = City::create(['name' => 'Lima', 'code' => 'LIM', 'department' => 'Lima', 'sort_order' => 1, 'is_active' => true]);
        $advisor = Advisor::create([
            'dni' => '12345678', 'name' => 'Asesor', 'phone' => '999', 'email' => 'a@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 0,
        ]);
        $project = Project::create(['name' => 'P1', 'location' => 'X', 'total_lots' => 10, 'blocks' => ['A']]);
        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 10000,
            'lot_status_id' => $reserved->id,
            'contract_date' => '2026-03-10',
            'operation_number' => 'OP-1',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.reservations.index', [
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/reservations')
                ->where('summary.total', 1)
                ->where('rows.0.operation_number', 'OP-1'));
    }
}
