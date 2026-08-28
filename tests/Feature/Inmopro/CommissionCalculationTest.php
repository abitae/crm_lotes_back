<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;
use App\Services\Inmopro\CommissionService;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommissionCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_commission_amount_matches_exact_decimal_arithmetic_not_float(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $advisor->level->update(['direct_rate' => '6.45', 'pyramid_rate' => '0']);

        $lot = Lot::query()->firstOrFail();
        $lot->update(['advisor_id' => $advisor->id, 'sale_price' => '17650.35']);

        app(CommissionService::class)->createCommissionsForTransferredLot($lot->fresh());

        // Ground truth computed independently with bcmath (arbitrary-precision decimal
        // arithmetic), not the float-based `price * (rate / 100)` the service used to do.
        $expected = bcadd(
            bcdiv(bcmul('17650.35', '6.45', 10), '100', 10),
            '0.005',
            2,
        );

        $commission = Commission::where('lot_id', $lot->id)->where('type', 'DIRECTA')->firstOrFail();
        $this->assertSame($expected, (string) $commission->amount);
        $this->assertSame('1138.45', (string) $commission->amount);
    }

    public function test_mark_as_paid_records_paid_at_and_paid_amount(): void
    {
        $lot = Lot::query()->firstOrFail();
        $commission = Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'amount' => 850.50,
            'percentage' => 5,
            'type' => 'DIRECTA',
            'commission_status_id' => CommissionStatus::where('code', 'PENDIENTE')->firstOrFail()->id,
            'date' => now(),
        ]);

        app(CommissionService::class)->markAsPaid($commission);
        $commission->refresh();

        $this->assertSame('PAGADO', $commission->status->code);
        $this->assertNotNull($commission->paid_at);
        $this->assertSame('850.50', (string) $commission->paid_amount);
    }

    public function test_recalculating_after_payment_updates_amount_but_not_the_paid_audit_trail(): void
    {
        $lot = Lot::query()->firstOrFail();
        $lot->update(['sale_price' => '10000']);
        $commission = Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'amount' => 500,
            'percentage' => 5,
            'type' => 'DIRECTA',
            'commission_status_id' => CommissionStatus::where('code', 'PENDIENTE')->firstOrFail()->id,
            'date' => now(),
        ]);

        app(CommissionService::class)->markAsPaid($commission);
        $paidAt = $commission->fresh()->paid_at;

        $lot->update(['sale_price' => '12000']);
        app(CommissionService::class)->recalculateForLot($lot);

        $commission->refresh();
        $this->assertSame('600.00', (string) $commission->amount);
        // The historical record of what was actually disbursed must not move.
        $this->assertSame('500.00', (string) $commission->paid_amount);
        $this->assertTrue($paidAt->equalTo($commission->paid_at));
    }
}
