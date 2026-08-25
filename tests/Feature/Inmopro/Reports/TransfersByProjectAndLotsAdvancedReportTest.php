<?php

namespace Tests\Feature\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TransfersByProjectAndLotsAdvancedReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_transfers_by_project_supports_date_range_and_detail_rows(): void
    {
        $this->travelTo(Carbon::parse('2026-03-20 12:00:00'));

        $status = LotStatus::create(['name' => 'Transferido', 'code' => 'TRANSFERIDO', 'color' => '#22c55e', 'sort_order' => 1]);
        $team = Team::create(['name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000', 'sort_order' => 1, 'is_active' => true]);
        $level = AdvisorLevel::create(['name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2, 'color' => '#000', 'sort_order' => 1]);
        $city = City::create(['name' => 'Arequipa', 'code' => 'AQP', 'department' => 'Arequipa', 'sort_order' => 1, 'is_active' => true]);
        $advisor = Advisor::create([
            'dni' => '12345678', 'name' => 'Cazador Uno', 'phone' => '999', 'email' => 'c@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 0,
        ]);
        $client = Client::create([
            'name' => 'Cliente Demo',
            'dni' => '87654321',
            'phone' => '988888888',
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
        $project = Project::create(['name' => 'Proyecto Sur', 'location' => 'X', 'total_lots' => 10, 'blocks' => ['A']]);
        $lot = Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'block' => 'A',
            'number' => '12',
            'area' => 120,
            'price' => 25000,
            'lot_status_id' => $status->id,
        ]);

        LotTransferConfirmation::create([
            'lot_id' => $lot->id,
            'requested_by' => User::factory()->create()->id,
            'status' => LotTransferConfirmation::STATUS_APPROVED,
            'evidence_path' => 'transfers/evidence-demo.pdf',
            'reviewed_at' => '2026-03-15 10:00:00',
            'reviewed_by' => User::factory()->create()->id,
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.transfers-by-project.index', [
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/transfers-by-project')
                ->where('summary.total_count', 1)
                ->where('detail_rows.0.client_name', 'Cliente Demo')
                ->where('detail_rows.0.city_name', 'Arequipa')
                ->where('detail_rows.0.project_name', 'Proyecto Sur')
                ->where('detail_rows.0.amount', 25000));
    }

    public function test_lots_advanced_filters_by_scope_and_client_search(): void
    {
        $this->travelTo(Carbon::parse('2026-03-20 12:00:00'));

        $reserved = LotStatus::create(['name' => 'Reservado', 'code' => 'RESERVADO', 'color' => '#f59e0b', 'sort_order' => 1]);
        $libre = LotStatus::create(['name' => 'Libre', 'code' => 'LIBRE', 'color' => '#94a3b8', 'sort_order' => 2]);
        $team = Team::create(['name' => 'T1', 'code' => 'T1', 'description' => 'T', 'color' => '#000', 'sort_order' => 1, 'is_active' => true]);
        $level = AdvisorLevel::create(['name' => 'L1', 'code' => 'L1', 'direct_rate' => 5, 'pyramid_rate' => 2, 'color' => '#000', 'sort_order' => 1]);
        $city = City::create(['name' => 'Cusco', 'code' => 'CUS', 'department' => 'Cusco', 'sort_order' => 1, 'is_active' => true]);
        $advisor = Advisor::create([
            'dni' => '11112222', 'name' => 'Cazador Dos', 'phone' => '977', 'email' => 'd@t.com',
            'city_id' => $city->id, 'team_id' => $team->id, 'advisor_level_id' => $level->id, 'personal_quota' => 0,
        ]);
        $client = Client::create([
            'name' => 'Ana Pérez',
            'dni' => '44556677',
            'phone' => '911111111',
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
        $project = Project::create(['name' => 'Proyecto Norte', 'location' => 'Y', 'total_lots' => 10, 'blocks' => ['B']]);

        Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'block' => 'B',
            'number' => '3',
            'area' => 90,
            'price' => 18000,
            'lot_status_id' => $reserved->id,
            'contract_date' => '2026-03-05',
            'payment_limit_date' => '2026-03-25',
        ]);

        Lot::create([
            'project_id' => $project->id,
            'block' => 'B',
            'number' => '4',
            'area' => 90,
            'price' => 18000,
            'lot_status_id' => $libre->id,
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.lots-advanced.index', [
                'scope' => 'reservado',
                'apply_dates' => '1',
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
                'client_search' => 'Ana',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/lots-advanced')
                ->where('summary.total', 1)
                ->where('rows.0.client_name', 'Ana Pérez')
                ->where('rows.0.city_name', 'Cusco'));
    }
}
