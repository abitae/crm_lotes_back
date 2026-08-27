<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CrmCommissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_advisor_only_sees_own_commissions(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $lot = Lot::firstOrFail();
        $status = CommissionStatus::firstOrFail();

        Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => $advisor->id,
            'amount' => 500,
            'percentage' => 2.5,
            'type' => 'VENTA',
            'commission_status_id' => $status->id,
            'date' => now(),
        ]);

        Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => $otherAdvisor->id,
            'amount' => 900,
            'percentage' => 3,
            'type' => 'VENTA',
            'commission_status_id' => $status->id,
            'date' => now(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.commissions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('commissions.data', 1)
                ->where('commissions.data.0.amount', '500.00'));
    }
}
