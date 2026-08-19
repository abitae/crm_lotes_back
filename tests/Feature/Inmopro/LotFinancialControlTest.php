<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotExpense;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Models\User;
use App\Services\Inmopro\CommissionService;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class LotFinancialControlTest extends TestCase
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
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_approving_pre_reservation_requires_and_persists_sale_price(): void
    {
        $user = User::factory()->create();
        $lot = Lot::query()->firstOrFail();
        $client = Client::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $lot->update(['lot_status_id' => LotStatus::where('code', 'PRERESERVA')->value('id')]);
        $preReservation = LotPreReservation::create([
            'lot_id' => $lot->id, 'client_id' => $client->id, 'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE', 'amount' => 1500, 'voucher_path' => 'test.png',
        ]);

        $this->actingAs($user)->post(route('inmopro.lot-pre-reservations.approve', $preReservation), [
            'review_notes' => 'Validado',
        ])->assertSessionHasErrors('sale_price');

        $this->actingAs($user)->post(route('inmopro.lot-pre-reservations.approve', $preReservation), [
            'review_notes' => 'Validado', 'sale_price' => 30000,
        ])->assertRedirect(route('inmopro.lot-pre-reservations.index'));

        $this->assertDatabaseHas('lots', [
            'id' => $lot->id, 'sale_price' => 30000, 'advance' => 1500, 'remaining_balance' => 28500,
        ]);
    }

    public function test_expenses_and_commissions_are_included_in_net_profit(): void
    {
        $lot = Lot::query()->firstOrFail();
        $lot->update(['list_price' => 35000, 'sale_price' => 32000, 'acquisition_cost' => 20000]);
        LotExpense::create([
            'lot_id' => $lot->id, 'category' => 'TRANSFERENCIA', 'concept' => 'Notaría',
            'amount' => 1000, 'expense_date' => now(), 'created_by' => User::factory()->create()->id,
        ]);
        Commission::query()->create([
            'lot_id' => $lot->id,
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'amount' => 1600,
            'percentage' => 5,
            'type' => 'DIRECTA',
            'commission_status_id' => CommissionStatus::query()->firstOrFail()->id,
            'date' => now(),
        ]);

        $metrics = $lot->fresh()->financialMetrics();
        $this->assertSame(9400.0, $metrics['net_profit']);
        $this->assertSame(-3000.0, $metrics['price_variance']);
        $this->assertSame(29.38, $metrics['profit_margin']);
    }

    public function test_correcting_sale_price_recalculates_paid_commissions(): void
    {
        $lot = Lot::query()->firstOrFail();
        $lot->update(['sale_price' => 10000]);
        $commission = Commission::query()->create([
            'lot_id' => $lot->id,
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'amount' => 500,
            'percentage' => 5,
            'type' => 'DIRECTA',
            'commission_status_id' => CommissionStatus::where('code', 'PAGADO')->firstOrFail()->id,
            'date' => now(),
        ]);

        $lot->update(['sale_price' => 12000]);
        app(CommissionService::class)->recalculateForLot($lot);

        $this->assertSame('600.00', (string) $commission->fresh()->amount);
    }

    public function test_authorized_user_can_add_a_detailed_expense(): void
    {
        $user = User::factory()->create();
        $permission = Permission::findOrCreate('inmopro.lots.expenses.store', 'web');
        $user->givePermissionTo($permission);
        $lot = Lot::query()->firstOrFail();

        $this->actingAs($user)->post(route('inmopro.lots.expenses.store', $lot), [
            'category' => 'OTRO', 'concept' => 'Trámite municipal', 'amount' => 250,
            'expense_date' => '2026-08-19', 'notes' => 'Pago documentario',
        ])->assertRedirect();

        $this->assertDatabaseHas('lot_expenses', [
            'lot_id' => $lot->id, 'category' => 'OTRO', 'concept' => 'Trámite municipal', 'amount' => 250,
        ]);
    }
}
