<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPayment;
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

class InmoproAccountsReceivableTest extends TestCase
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

        $lot = Lot::query()->first();
        $client = Client::query()->first();
        $advisor = Advisor::query()->first();
        $lot?->update([
            'lot_status_id' => LotStatus::query()->where('code', LotStatus::CODE_RESERVADO)->value('id'),
            'client_id' => $client?->id,
            'advisor_id' => $advisor?->id,
            'client_name' => $client?->name,
            'client_dni' => $client?->dni,
            'contract_date' => now()->toDateString(),
            'sale_price' => $lot?->price,
        ]);
    }

    public function test_authenticated_users_can_visit_accounts_receivable_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.accounts-receivable.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/accounts-receivable')
            ->has('lots')
            ->where('filters.start_date', now()->startOfMonth()->toDateString())
            ->where('filters.end_date', now()->endOfMonth()->toDateString())
            ->has('teams'));
    }

    public function test_summary_includes_all_filtered_lots_not_only_current_page(): void
    {
        $user = User::factory()->create();
        Lot::query()->update([
            'lot_status_id' => LotStatus::query()->where('code', LotStatus::CODE_RESERVADO)->value('id'),
            'contract_date' => now()->toDateString(),
            'sale_price' => 1000,
        ]);
        $lotCount = Lot::query()->count();
        $this->assertGreaterThan(15, $lotCount);
        $this->actingAs($user);

        $this->get(route('inmopro.accounts-receivable.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/accounts-receivable')
                ->has('lots.data', 15)
                ->where('lots.total', $lotCount)
                ->where('summary.portfolio', fn ($portfolio) => (float) $portfolio === (float) ($lotCount * 1000)));
    }

    public function test_authenticated_users_can_create_installment_and_payment_for_cuotas_lot(): void
    {
        Storage::fake(FileStorage::disk());

        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $lot->update([
            'lot_status_id' => LotStatus::query()->where('code', LotStatus::CODE_CUOTAS)->value('id'),
        ]);
        $cashAccount = CashAccount::create([
            'name' => 'Caja Principal',
            'type' => 'CAJA',
            'currency' => 'PEN',
            'initial_balance' => 100,
            'current_balance' => 100,
            'is_active' => true,
        ]);
        $this->actingAs($user);

        $this->post(route('inmopro.lots.installments.store', $lot), [
            'due_date' => now()->addDays(15)->toDateString(),
            'amount' => 2500,
            'notes' => 'Primera cuota',
        ])->assertRedirect();

        $installment = $lot->installments()->first();
        $this->assertNotNull($installment);

        $this->post(route('inmopro.lots.payments.store', $lot), [
            'lot_installment_id' => $installment->id,
            'cash_account_id' => $cashAccount->id,
            'amount' => 2500,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'TRANSFERENCIA',
            'reference' => 'OP-100',
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertRedirect();

        $payment = LotPayment::query()->where('lot_id', $lot->id)->first();
        $this->assertNotNull($payment);
        $this->assertNotNull($payment->voucher_path);
        Storage::disk(FileStorage::disk())->assertExists($payment->voucher_path);

        $this->assertDatabaseHas('lot_payments', [
            'lot_id' => $lot->id,
            'amount' => 2500,
        ]);
        $this->assertDatabaseHas('lot_installments', [
            'id' => $installment->id,
            'status' => 'PAGADA',
        ]);
        $this->assertDatabaseHas('cash_entries', [
            'cash_account_id' => $cashAccount->id,
            'type' => 'INGRESO',
            'amount' => 2500,
        ]);
        $this->assertDatabaseHas('cash_accounts', [
            'id' => $cashAccount->id,
            'current_balance' => 2600,
        ]);
    }

    public function test_cannot_create_installment_when_lot_is_not_cuotas(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $this->assertSame(
            LotStatus::CODE_RESERVADO,
            LotStatus::query()->find($lot->lot_status_id)?->code,
        );
        $this->actingAs($user);

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.installments.store', $lot), [
                'due_date' => now()->addDays(15)->toDateString(),
                'amount' => 2500,
                'notes' => 'Primera cuota',
            ])
            ->assertRedirect(route('inmopro.accounts-receivable.index'))
            ->assertSessionHasErrors('amount');

        $this->assertDatabaseCount('lot_installments', 0);
    }

    public function test_payment_requires_voucher_image(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $this->actingAs($user);

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payments.store', $lot), [
                'amount' => 2500,
                'paid_at' => now()->toDateString(),
                'payment_method' => 'TRANSFERENCIA',
            ])
            ->assertRedirect(route('inmopro.accounts-receivable.index'))
            ->assertSessionHasErrors('voucher_image');

        $this->assertDatabaseCount('lot_payments', 0);
    }

    public function test_payment_voucher_can_be_viewed(): void
    {
        Storage::fake(FileStorage::disk());

        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $this->actingAs($user);

        $this->post(route('inmopro.lots.payments.store', $lot), [
            'amount' => 1000,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'EFECTIVO',
            'voucher_image' => UploadedFile::fake()->image('comprobante.jpg'),
        ])->assertRedirect();

        $payment = LotPayment::query()->where('lot_id', $lot->id)->firstOrFail();

        $this->get(route('inmopro.lot-payments.voucher', $payment))
            ->assertOk();
    }

    public function test_accounts_receivable_can_filter_by_project_and_client(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->with(['project', 'client'])->firstOrFail();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.accounts-receivable.index', [
            'project_id' => $lot->project_id,
            'search' => $lot->client?->name,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/accounts-receivable')
            ->where('filters.project_id', (string) $lot->project_id)
            ->where('filters.search', $lot->client?->name));
    }

    public function test_accounts_receivable_can_filter_by_lot_status(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $lot->update(['block' => 'STATUSFILTER']);
        $statusId = $lot->lot_status_id;
        $this->actingAs($user);

        $this->get(route('inmopro.accounts-receivable.index', [
            'lot_status_id' => $statusId,
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/accounts-receivable')
                ->where('filters.lot_status_id', (string) $statusId)
                ->has('lotStatuses')
                ->where('lots.data.0.status.id', $statusId));

        $otherStatusId = LotStatus::query()
            ->where('id', '!=', $statusId)
            ->whereNotIn('code', [LotStatus::CODE_LIBRE, LotStatus::CODE_PRERESERVA])
            ->value('id');

        if ($otherStatusId === null) {
            $this->markTestSkipped('No hay otro estado de lote disponible para contrastar el filtro.');
        }

        $this->get(route('inmopro.accounts-receivable.index', [
            'lot_status_id' => $otherStatusId,
            'search' => 'STATUSFILTER',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('lots.data', 0));
    }

    public function test_payment_on_transferred_lot_is_rejected(): void
    {
        Storage::fake(FileStorage::disk());
        $lot = $this->receivableLot(LotStatus::CODE_TRANSFERIDO, salePrice: 10000, advance: 10000);
        $this->actingAs(User::factory()->create());

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 100]))
            ->assertSessionHasErrors('amount');

        $this->assertDatabaseCount('lot_payments', 0);
        $lot->refresh();
        $this->assertEquals(10000, (float) $lot->advance);
        $this->assertEquals(0, (float) $lot->remaining_balance);
    }

    public function test_payment_on_reserved_lot_keeps_pre_reservation_advance_and_uses_sale_price(): void
    {
        Storage::fake(FileStorage::disk());
        $lot = $this->receivableLot(LotStatus::CODE_RESERVADO, salePrice: 12000, advance: 2000);
        $lot->update(['price' => 15000]);
        $this->actingAs(User::factory()->create());

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 500]))
            ->assertSessionHasNoErrors();

        $lot->refresh();
        $this->assertEquals(2500, (float) $lot->advance);
        $this->assertEquals(9500, (float) $lot->remaining_balance);
    }

    public function test_payment_exceeding_lot_balance_is_rejected(): void
    {
        Storage::fake(FileStorage::disk());
        $lot = $this->receivableLot(LotStatus::CODE_RESERVADO, salePrice: 5000, advance: 4500);
        $this->actingAs(User::factory()->create());

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload(['amount' => 600]))
            ->assertSessionHasErrors('amount');

        $this->assertDatabaseCount('lot_payments', 0);
        $this->assertEquals(4500, (float) $lot->refresh()->advance);
    }

    public function test_payment_exceeding_installment_balance_or_on_paid_installment_is_rejected(): void
    {
        Storage::fake(FileStorage::disk());
        $lot = $this->receivableLot(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $installment = $lot->installments()->create([
            'sequence' => 1,
            'due_date' => now()->addDays(10)->toDateString(),
            'amount' => 1000,
            'paid_amount' => 0,
            'status' => InstallmentStatus::PENDIENTE,
        ]);
        $paidInstallment = $lot->installments()->create([
            'sequence' => 2,
            'due_date' => now()->addDays(40)->toDateString(),
            'amount' => 1000,
            'paid_amount' => 1000,
            'status' => InstallmentStatus::PAGADA,
        ]);
        $this->actingAs(User::factory()->create());

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload([
                'lot_installment_id' => $installment->id,
                'amount' => 1200,
            ]))
            ->assertSessionHasErrors('amount');

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload([
                'lot_installment_id' => $paidInstallment->id,
                'amount' => 100,
            ]))
            ->assertSessionHasErrors('lot_installment_id');

        $this->assertDatabaseCount('lot_payments', 0);
    }

    public function test_payment_validates_installment_owner_cash_account_and_method(): void
    {
        Storage::fake(FileStorage::disk());
        $lot = $this->receivableLot(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $otherLot = Lot::query()->whereKeyNot($lot->id)->firstOrFail();
        $foreignInstallment = $otherLot->installments()->create([
            'sequence' => 1,
            'due_date' => now()->addDays(10)->toDateString(),
            'amount' => 1000,
            'status' => InstallmentStatus::PENDIENTE,
        ]);
        $inactiveAccount = $this->cashAccount(isActive: false);
        $this->actingAs(User::factory()->create());

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload([
                'lot_installment_id' => $foreignInstallment->id,
                'cash_account_id' => $inactiveAccount->id,
                'payment_method' => 'CHEQUE',
            ]))
            ->assertSessionHasErrors(['lot_installment_id', 'cash_account_id', 'payment_method']);

        $this->assertDatabaseCount('lot_payments', 0);
    }

    public function test_installment_schedule_cannot_exceed_lot_balance(): void
    {
        $lot = $this->receivableLot(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 4000);
        $this->actingAs(User::factory()->create());

        $this->post(route('inmopro.lots.installments.store', $lot), [
            'due_date' => now()->addMonth()->toDateString(),
            'amount' => 5000,
        ])->assertSessionHasNoErrors();

        $this->from(route('inmopro.accounts-receivable.index'))
            ->post(route('inmopro.lots.installments.store', $lot), [
                'due_date' => now()->addMonths(2)->toDateString(),
                'amount' => 1500,
            ])
            ->assertSessionHasErrors('amount');

        $this->assertDatabaseCount('lot_installments', 1);
    }

    public function test_command_marks_past_due_pending_installments_as_overdue(): void
    {
        $lot = $this->receivableLot(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $pastDue = $lot->installments()->create([
            'sequence' => 1,
            'due_date' => now()->subDay()->toDateString(),
            'amount' => 1000,
            'status' => InstallmentStatus::PENDIENTE,
        ]);
        $dueToday = $lot->installments()->create([
            'sequence' => 2,
            'due_date' => now()->toDateString(),
            'amount' => 1000,
            'status' => InstallmentStatus::PENDIENTE,
        ]);

        $this->artisan('receivables:mark-overdue-installments')->assertSuccessful();

        $this->assertSame(InstallmentStatus::VENCIDA, $pastDue->refresh()->status);
        $this->assertSame(InstallmentStatus::PENDIENTE, $dueToday->refresh()->status);
    }

    public function test_summary_pending_equals_sum_of_lot_balances(): void
    {
        Lot::query()->whereNotNull('client_id')->update(['contract_date' => now()->subYear()->toDateString()]);
        $first = $this->receivableLot(LotStatus::CODE_RESERVADO, salePrice: 10000, advance: 2500);
        $second = Lot::query()->whereKeyNot($first->id)->firstOrFail();
        $second->update([
            'lot_status_id' => LotStatus::query()->where('code', LotStatus::CODE_RESERVADO)->value('id'),
            'contract_date' => now()->toDateString(),
            'sale_price' => 8000,
            'advance' => 1000,
        ]);
        $this->actingAs(User::factory()->create());

        $this->get(route('inmopro.accounts-receivable.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.portfolio', fn ($value) => (float) $value === 18000.0)
                ->where('summary.collected', fn ($value) => (float) $value === 3500.0)
                ->where('summary.pending', fn ($value) => (float) $value === 14500.0));
    }

    public function test_payment_can_be_voided_reverting_installment_cash_and_lot(): void
    {
        Storage::fake(FileStorage::disk());
        $lot = $this->receivableLot(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 1000);
        $installment = $lot->installments()->create([
            'sequence' => 1,
            'due_date' => now()->addDays(10)->toDateString(),
            'amount' => 2000,
            'status' => InstallmentStatus::PENDIENTE,
        ]);
        $cashAccount = $this->cashAccount();
        $this->actingAs(User::factory()->create());

        $this->post(route('inmopro.lots.payments.store', $lot), $this->paymentPayload([
            'lot_installment_id' => $installment->id,
            'cash_account_id' => $cashAccount->id,
            'amount' => 2000,
        ]))->assertSessionHasNoErrors();

        $payment = LotPayment::query()->where('lot_id', $lot->id)->firstOrFail();
        $this->assertSame(InstallmentStatus::PAGADA, $installment->refresh()->status);

        $this->from(route('inmopro.accounts-receivable.index'))
            ->delete(route('inmopro.lot-payments.destroy', $payment), ['reason' => ''])
            ->assertSessionHasErrors('reason');

        $this->delete(route('inmopro.lot-payments.destroy', $payment), ['reason' => 'Abono duplicado'])
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($payment);
        Storage::disk(FileStorage::disk())->assertMissing($payment->voucher_path);
        $installment->refresh();
        $this->assertEquals(0, (float) $installment->paid_amount);
        $this->assertSame(InstallmentStatus::PENDIENTE, $installment->status);
        $lot->refresh();
        $this->assertEquals(1000, (float) $lot->advance);
        $this->assertEquals(9000, (float) $lot->remaining_balance);
        $this->assertEquals(100, (float) $cashAccount->refresh()->current_balance);
        $this->assertDatabaseHas('cash_entries', [
            'cash_account_id' => $cashAccount->id,
            'type' => 'EGRESO',
            'amount' => 2000,
            'notes' => 'Abono duplicado',
        ]);
    }

    public function test_whole_portfolio_ignores_contract_date_and_hides_free_statuses(): void
    {
        $lot = $this->receivableLot(LotStatus::CODE_CUOTAS, salePrice: 10000, advance: 0);
        $lot->update(['contract_date' => now()->subYears(2)->toDateString(), 'block' => 'OLDCONTRACT']);
        $this->actingAs(User::factory()->create());

        $this->get(route('inmopro.accounts-receivable.index', ['search' => 'OLDCONTRACT']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('lots.data', 0));

        $this->get(route('inmopro.accounts-receivable.index', [
            'search' => 'OLDCONTRACT',
            'start_date' => '',
            'end_date' => '',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('lots.data', 1)
                ->where('filters.start_date', '')
                ->where('lotStatuses', fn ($statuses) => collect($statuses)
                    ->pluck('code')
                    ->intersect([LotStatus::CODE_LIBRE, LotStatus::CODE_PRERESERVA])
                    ->isEmpty()));
    }

    private function receivableLot(string $statusCode, float $salePrice, float $advance): Lot
    {
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $lot->update([
            'lot_status_id' => LotStatus::query()->where('code', $statusCode)->value('id'),
            'sale_price' => $salePrice,
            'advance' => $advance,
            'remaining_balance' => max(0, $salePrice - $advance),
            'contract_date' => now()->toDateString(),
        ]);

        return $lot->refresh();
    }

    private function cashAccount(bool $isActive = true): CashAccount
    {
        return CashAccount::create([
            'name' => $isActive ? 'Caja Principal' : 'Caja Cerrada',
            'type' => 'CAJA',
            'currency' => 'PEN',
            'initial_balance' => 100,
            'current_balance' => 100,
            'is_active' => $isActive,
        ]);
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
