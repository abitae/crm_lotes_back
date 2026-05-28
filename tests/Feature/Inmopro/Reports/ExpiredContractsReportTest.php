<?php

namespace Tests\Feature\Inmopro\Reports;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ExpiredContractsReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_expired_contracts_lists_overdue_reserved_lots(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $reserved = LotStatus::create(['name' => 'Reservado', 'code' => 'RESERVADO', 'color' => '#f59e0b', 'sort_order' => 1]);
        $project = Project::create(['name' => 'P1', 'location' => 'X', 'total_lots' => 10, 'blocks' => ['A']]);
        Lot::create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '2',
            'area' => 100,
            'price' => 5000,
            'lot_status_id' => $reserved->id,
            'payment_limit_date' => '2026-03-01',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.expired-contracts.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/expired-contracts')
                ->where('summary.total', 1));
    }
}
