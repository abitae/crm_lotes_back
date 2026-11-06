<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotInstallment;
use App\Models\Inmopro\LotPayment;
use App\Models\Inmopro\LotPaymentPlan;
use App\Models\Inmopro\LotStatus;
use App\Models\User;
use App\Support\FileStorage;
use App\Support\InstallmentStatus;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InmoproPaymentScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
        Storage::fake(FileStorage::disk());
        $this->actingAs(User::factory()->create());
    }

    public function test_generates_monthly_schedule_with_end_of_month_dates_and_exact_total(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 12000, advance: 2000);

        $this->post(route('inmopro.lots.payment-schedule.store', $lot), [
            'mode' => 'AGREGAR',
            'installments_count' => 3,
            'frequency' => LotPaymentPlan::FREQUENCY_MONTHLY,
            'first_due_date' => '2027-01-31',
        ])->assertSessionHasNoErrors();

        $installments = $lot->installments()->get();
        $this->assertCount(3, $installments);
        $this->assertSame(['2027-01-31', '2027-02-28', '2027-03-31'], $installments->map(fn (LotInstallment $installment) => $installment->due_date->toDateString())->all());
        $this->assertSame([3333.33, 3333.33, 3333.34], $installments->map(fn (LotInstallment $installment) => (float) $installment->amount)->all());
        $this->assertSame([1, 2, 3], $installments->pluck('sequence')->all());

        $plan = LotPaymentPlan::query()->where('lot_id', $lot->id)->sole();
        $this->assertSame(LotPaymentPlan::STATUS_ACTIVE, $plan->status);
        $this->assertEquals(10000, (float) $plan->financed_amount);
        $this->assertTrue($installments->every(fn (LotInstallment $installment) => $installment->lot_payment_plan_id === $plan->id));
    }

    public function test_biweekly_schedule_uses_given_amount_and_fifteen_day_steps(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);

        $this->post(route('inmopro.lots.payment-schedule.store', $lot), [
            'mode' => 'AGREGAR',
            'installments_count' => 2,
            'frequency' => LotPaymentPlan::FREQUENCY_BIWEEKLY,
            'first_due_date' => '2027-03-01',
            'financed_amount' => 4000,
        ])->assertSessionHasNoErrors();

        $installments = $lot->installments()->get();
        $this->assertSame(['2027-03-01', '2027-03-16'], $installments->map(fn (LotInstallment $installment) => $installment->due_date->toDateString())->all());
        $this->assertEquals(4000, (float) $installments->sum('amount'));
    }

    public function test_schedule_is_rejected_for_non_cuotas_lot_or_amount_above_balance(): void
    {
        $reserved = $this->lotWithBalance(LotStatus::CODE_RESERVADO, salePrice: 10000, advance: 0);

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payment-schedule.store', $reserved), $this->schedulePayload())
            ->assertSessionHasErrors('installments_count');

        $reserved->update(['lot_status_id' => LotStatus::query()->where('code', LotStatus::CODE_CUOTAS)->value('id')]);

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payment-schedule.store', $reserved), $this->schedulePayload(['financed_amount' => 10000.01]))
            ->assertSessionHasErrors('financed_amount');

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payment-schedule.store', $reserved), $this->schedulePayload(['frequency' => 'ANUAL', 'installments_count' => 0]))
            ->assertSessionHasErrors(['frequency', 'installments_count']);

        $this->assertDatabaseCount('lot_installments', 0);
        $this->assertDatabaseCount('lot_payment_plans', 0);
    }

    public function test_reschedule_keeps_installments_with_payments_and_replaces_the_rest(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 6000, advance: 0);
        $this->post(route('inmopro.lots.payment-schedule.store', $lot), $this->schedulePayload([
            'installments_count' => 3,
            'first_due_date' => now()->addMonth()->toDateString(),
        ]))->assertSessionHasNoErrors();

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 2500]))
            ->assertSessionHasNoErrors();

        $this->post(route('inmopro.lots.payment-schedule.store', $lot), $this->schedulePayload([
            'mode' => 'REPROGRAMAR',
            'installments_count' => 2,
            'first_due_date' => now()->addMonths(2)->toDateString(),
        ]))->assertSessionHasNoErrors();

        $installments = $lot->installments()->get();
        $this->assertSame([1, 2, 3, 4], $installments->pluck('sequence')->all());
        $this->assertSame(InstallmentStatus::PAGADA, $installments->firstWhere('sequence', 1)->status);
        $this->assertSame(InstallmentStatus::PARCIAL, $installments->firstWhere('sequence', 2)->status);
        $this->assertEquals(2000, (float) $installments->whereIn('sequence', [3, 4])->sum('amount'));
        $this->assertEquals(3500, (float) $installments->sum(fn (LotInstallment $installment) => $installment->balance()));

        $this->assertSame(
            [LotPaymentPlan::STATUS_ACTIVE, LotPaymentPlan::STATUS_REPLACED],
            LotPaymentPlan::query()->where('lot_id', $lot->id)->orderByDesc('id')->pluck('status')->all(),
        );
    }

    public function test_payment_without_installment_is_applied_to_oldest_installments_first(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $later = $this->installment($lot, sequence: 1, dueDate: now()->addMonths(2)->toDateString(), amount: 1000);
        $oldest = $this->installment($lot, sequence: 2, dueDate: now()->subDays(5)->toDateString(), amount: 1000, status: InstallmentStatus::VENCIDA);
        $middle = $this->installment($lot, sequence: 3, dueDate: now()->addMonth()->toDateString(), amount: 1000);

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 1500]))
            ->assertSessionHasNoErrors();

        $payment = LotPayment::query()->where('lot_id', $lot->id)->sole();
        $this->assertNull($payment->lot_installment_id);
        $this->assertSame(InstallmentStatus::PAGADA, $oldest->refresh()->status);
        $this->assertSame(InstallmentStatus::PARCIAL, $middle->refresh()->status);
        $this->assertEquals(500, (float) $middle->paid_amount);
        $this->assertSame(InstallmentStatus::PENDIENTE, $later->refresh()->status);
        $this->assertEquals(
            [$oldest->id => 1000.0, $middle->id => 500.0],
            $payment->allocations()->get()->mapWithKeys(fn ($allocation) => [$allocation->lot_installment_id => (float) $allocation->amount])->all(),
        );
        $this->assertEquals(1500, (float) $lot->refresh()->advance);
    }

    public function test_payment_beyond_scheduled_installments_stays_as_balance_payment(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $installment = $this->installment($lot, sequence: 1, dueDate: now()->addMonth()->toDateString(), amount: 1000);

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 1800]))
            ->assertSessionHasNoErrors();

        $this->assertSame(InstallmentStatus::PAGADA, $installment->refresh()->status);
        $this->assertEquals(1000, (float) LotPayment::query()->sole()->allocations()->sum('amount'));
        $this->assertEquals(8200, (float) $lot->refresh()->remaining_balance);
    }

    public function test_balance_payment_on_lot_without_schedule_creates_no_allocations(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_RESERVADO, salePrice: 10000, advance: 1000);

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 2000]))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('lot_payment_allocations', 0);
        $lot->refresh();
        $this->assertEquals(3000, (float) $lot->advance);
        $this->assertEquals(7000, (float) $lot->remaining_balance);
    }

    public function test_voiding_a_distributed_payment_reverts_every_installment(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $first = $this->installment($lot, sequence: 1, dueDate: now()->addDays(5)->toDateString(), amount: 1000);
        $second = $this->installment($lot, sequence: 2, dueDate: now()->addDays(35)->toDateString(), amount: 1000);

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 1600]))
            ->assertSessionHasNoErrors();
        $payment = LotPayment::query()->sole();

        $this->delete(route('inmopro.lot-payments.destroy', $payment), ['reason' => 'Error de registro'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('lot_payment_allocations', 0);
        foreach ([$first->refresh(), $second->refresh()] as $installment) {
            $this->assertEquals(0, (float) $installment->paid_amount);
            $this->assertSame(InstallmentStatus::PENDIENTE, $installment->status);
        }
        $this->assertEquals(0, (float) $lot->refresh()->advance);
    }

    public function test_index_exposes_schedule_data_for_each_lot(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 1000);
        $this->installment($lot, sequence: 1, dueDate: now()->subDays(3)->toDateString(), amount: 2000, status: InstallmentStatus::VENCIDA);

        $this->get(route('inmopro.accounts-receivable.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('scheduleFrequencies', LotPaymentPlan::FREQUENCIES)
                ->where('lots.data.0.id', $lot->id)
                ->where('lots.data.0.next_installment.sequence', 1)
                ->where('lots.data.0.overdue_days', 3)
                ->where('lots.data.0.schedulable_amount.AGREGAR', fn ($value) => (float) $value === 7000.0)
                ->where('lots.data.0.schedulable_amount.REPROGRAMAR', fn ($value) => (float) $value === 9000.0));
    }

    public function test_allocation_migration_backfills_existing_installment_payments(): void
    {
        $lot = $this->lotWithBalance(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $installment = $this->installment($lot, sequence: 1, dueDate: now()->addMonth()->toDateString(), amount: 1000);
        $legacyPayment = LotPayment::query()->create([
            'lot_id' => $lot->id,
            'lot_installment_id' => $installment->id,
            'amount' => 400,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'EFECTIVO',
        ]);
        LotPayment::query()->create([
            'lot_id' => $lot->id,
            'amount' => 300,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'EFECTIVO',
        ]);

        $migration = require database_path('migrations/2026_11_06_123932_create_lot_payment_allocations_table.php');
        $migration->down();
        $migration->up();

        $this->assertDatabaseCount('lot_payment_allocations', 1);
        $this->assertDatabaseHas('lot_payment_allocations', [
            'lot_payment_id' => $legacyPayment->id,
            'lot_installment_id' => $installment->id,
            'amount' => 400,
        ]);
    }

    private function lotWithBalance(string $statusCode, float $salePrice, float $advance): Lot
    {
        $client = Client::query()->firstOrFail();
        $lot = Lot::query()->firstOrFail();
        $lot->update([
            'lot_status_id' => LotStatus::query()->where('code', $statusCode)->value('id'),
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_dni' => $client->dni,
            'sale_price' => $salePrice,
            'advance' => $advance,
            'remaining_balance' => max(0, $salePrice - $advance),
            'contract_date' => now()->toDateString(),
        ]);

        return $lot->refresh();
    }

    private function installment(Lot $lot, int $sequence, string $dueDate, float $amount, string $status = InstallmentStatus::PENDIENTE): LotInstallment
    {
        return $lot->installments()->create([
            'sequence' => $sequence,
            'due_date' => $dueDate,
            'amount' => $amount,
            'paid_amount' => 0,
            'status' => $status,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function schedulePayload(array $overrides = []): array
    {
        return [
            'mode' => 'AGREGAR',
            'installments_count' => 12,
            'frequency' => LotPaymentPlan::FREQUENCY_MONTHLY,
            'first_due_date' => now()->addMonth()->toDateString(),
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function paymentPayload(array $overrides = []): array
    {
        return [
            'amount' => 1000,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ...$overrides,
        ];
    }
}
