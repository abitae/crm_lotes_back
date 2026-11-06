<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\CashEntry;
use App\Models\Inmopro\Investor;
use App\Models\Inmopro\InvestorContract;
use App\Models\Inmopro\InvestorInstallment;
use App\Models\Inmopro\InvestorPayment;
use App\Models\User;
use App\Services\Inmopro\InvestorScheduleService;
use App\Support\InstallmentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InmoproInvestorsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private CashAccount $cash;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake(config('cazador.default_storage_disk', config('filesystems.default', 'public')));
        Storage::fake('public');

        $this->user = User::factory()->create();
        $this->cash = CashAccount::create([
            'name' => 'Caja principal',
            'type' => 'BANCO',
            'currency' => 'PEN',
            'initial_balance' => 1000,
            'current_balance' => 1000,
            'is_active' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function contractPayload(array $overrides = []): array
    {
        return [
            'currency' => 'PEN',
            'principal_amount' => 50000,
            'received_at' => '2026-01-15',
            'cash_account_id' => $this->cash->id,
            'rate_percent' => 18,
            'rate_period' => InvestorContract::RATE_ANNUAL,
            'payment_mode' => InvestorContract::MODE_INTEREST_ONLY,
            'term_months' => 12,
            'installments_count' => 12,
            'frequency' => 'MENSUAL',
            'first_due_date' => '2026-02-15',
            'withholding_percent' => 0,
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createActiveContract(Investor $investor, array $overrides = []): InvestorContract
    {
        $this->actingAs($this->user)
            ->post(route('inmopro.investor-contracts.store', $investor), $this->contractPayload($overrides))
            ->assertSessionHasNoErrors();

        $contract = $investor->contracts()->latest('id')->firstOrFail();

        $this->post(route('inmopro.investor-contracts.activate', $contract))->assertSessionHasNoErrors();

        return $contract->refresh();
    }

    public function test_interest_only_schedule_pays_interest_monthly_and_capital_at_the_end(): void
    {
        $rows = app(InvestorScheduleService::class)->build($this->contractPayload());

        $this->assertCount(12, $rows);
        $this->assertSame(750.0, $rows[0]['amount']);
        $this->assertSame(0.0, $rows[0]['principal_amount']);
        $this->assertSame(50750.0, $rows[11]['amount']);
        $this->assertSame(50000.0, $rows[11]['principal_amount']);
        $this->assertEqualsWithDelta(59000, array_sum(array_column($rows, 'amount')), 0.001);
        $this->assertSame('2026-02-15', $rows[0]['due_date']);
        $this->assertSame('2027-01-15', $rows[11]['due_date']);
    }

    public function test_equal_installments_split_capital_and_interest_and_last_absorbs_rounding(): void
    {
        $rows = app(InvestorScheduleService::class)->build($this->contractPayload([
            'payment_mode' => InvestorContract::MODE_EQUAL,
        ]));

        $this->assertCount(12, $rows);
        $this->assertSame(4166.66, $rows[0]['principal_amount']);
        $this->assertSame(750.0, $rows[0]['interest_amount']);
        $this->assertSame(4166.74, $rows[11]['principal_amount']);
        $this->assertEqualsWithDelta(50000, array_sum(array_column($rows, 'principal_amount')), 0.001);
        $this->assertEqualsWithDelta(59000, array_sum(array_column($rows, 'amount')), 0.001);
    }

    public function test_bullet_contract_has_a_single_installment_with_capital_and_interest(): void
    {
        $rows = app(InvestorScheduleService::class)->build($this->contractPayload([
            'payment_mode' => InvestorContract::MODE_BULLET,
            'first_due_date' => '2027-01-15',
        ]));

        $this->assertCount(1, $rows);
        $this->assertSame(59000.0, $rows[0]['amount']);
        $this->assertSame('2027-01-15', $rows[0]['due_date']);
    }

    public function test_rate_period_adjusts_interest_to_the_term(): void
    {
        $service = app(InvestorScheduleService::class);

        $this->assertSame(1_000_000, $service->totalInterestCents(100000, 10, InvestorContract::RATE_TOTAL, 6));
        $this->assertSame(1_200_000, $service->totalInterestCents(100000, 2, InvestorContract::RATE_MONTHLY, 6));
        $this->assertSame(600_000, $service->totalInterestCents(100000, 12, InvestorContract::RATE_ANNUAL, 6));
    }

    public function test_monthly_dates_do_not_overflow_at_month_end(): void
    {
        $rows = app(InvestorScheduleService::class)->build($this->contractPayload([
            'received_at' => '2026-01-01',
            'first_due_date' => '2026-01-31',
            'installments_count' => 3,
            'term_months' => 3,
        ]));

        $this->assertSame(['2026-01-31', '2026-02-28', '2026-03-31'], array_column($rows, 'due_date'));
    }

    public function test_investor_can_be_created_and_listed(): void
    {
        $this->actingAs($this->user)
            ->post(route('inmopro.investors.store'), [
                'person_type' => 'NATURAL',
                'name' => 'Ana Prestamista',
                'document_type' => 'DNI',
                'document_number' => '44556677',
            ])
            ->assertRedirect();

        $this->get(route('inmopro.investors.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/investors/index')
                ->where('investors.data.0.name', 'Ana Prestamista')
                ->has('summary')
                ->has('upcoming'));

        $this->post(route('inmopro.investors.store'), [
            'person_type' => 'NATURAL',
            'name' => 'Duplicado',
            'document_type' => 'DNI',
            'document_number' => '44556677',
        ])->assertSessionHasErrors('document_number');
    }

    public function test_contract_is_created_as_draft_and_activation_records_cash_income(): void
    {
        $investor = Investor::factory()->create();

        $this->actingAs($this->user)
            ->post(route('inmopro.investor-contracts.store', $investor), [
                ...$this->contractPayload(),
                'contract_file' => UploadedFile::fake()->create('contrato.pdf', 100, 'application/pdf'),
            ])
            ->assertRedirect();

        $contract = $investor->contracts()->firstOrFail();
        $this->assertSame(InvestorContract::STATUS_DRAFT, $contract->status);
        $this->assertSame('INV-'.now()->format('Y').'-0001', $contract->code);
        $this->assertSame('9000.00', $contract->total_interest);
        $this->assertSame('59000.00', $contract->total_payable);
        $this->assertCount(12, $contract->installments);
        $this->assertNotNull($contract->contract_path);
        $this->assertSame(1000.0, (float) $this->cash->refresh()->current_balance);

        $this->post(route('inmopro.investor-contracts.activate', $contract))->assertSessionHasNoErrors();

        $contract->refresh();
        $this->assertSame(InvestorContract::STATUS_ACTIVE, $contract->status);
        $this->assertSame(51000.0, (float) $this->cash->refresh()->current_balance);
        $this->assertDatabaseHas('cash_entries', [
            'investor_contract_id' => $contract->id,
            'type' => 'INGRESO',
            'amount' => 50000,
        ]);

        $this->put(route('inmopro.investor-contracts.update', $contract), $this->contractPayload())
            ->assertSessionHasErrors('status');
    }

    public function test_draft_contract_accepts_custom_schedule_only_when_capital_matches(): void
    {
        $investor = Investor::factory()->create();
        $this->actingAs($this->user);

        $this->post(route('inmopro.investor-contracts.store', $investor), $this->contractPayload([
            'principal_amount' => 10000,
            'installments' => [
                ['due_date' => '2026-03-01', 'principal_amount' => 4000, 'interest_amount' => 500],
                ['due_date' => '2026-06-01', 'principal_amount' => 5000, 'interest_amount' => 500],
            ],
        ]))->assertSessionHasErrors('installments');

        $this->post(route('inmopro.investor-contracts.store', $investor), $this->contractPayload([
            'principal_amount' => 10000,
            'installments' => [
                ['due_date' => '2026-06-01', 'principal_amount' => 6000, 'interest_amount' => 700],
                ['due_date' => '2026-03-01', 'principal_amount' => 4000, 'interest_amount' => 500],
            ],
        ]))->assertSessionHasNoErrors();

        $contract = $investor->contracts()->firstOrFail();
        $this->assertSame('1200.00', $contract->total_interest);
        $this->assertSame(2, $contract->installments_count);
        $this->assertSame('2026-03-01', $contract->installments->first()->due_date->toDateString());
    }

    public function test_payment_applies_to_oldest_installments_interest_first_and_settles_contract(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor, [
            'principal_amount' => 1000,
            'rate_percent' => 10,
            'rate_period' => InvestorContract::RATE_TOTAL,
            'term_months' => 2,
            'installments_count' => 2,
        ]);

        $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
            'cash_account_id' => $this->cash->id,
            'amount' => 80,
            'paid_at' => '2026-02-15',
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
        ])->assertSessionHasNoErrors();

        $installments = $contract->installments()->get();
        $this->assertSame(InstallmentStatus::PAGADA, $installments[0]->status);
        $this->assertSame(InstallmentStatus::PARCIAL, $installments[1]->status);
        $this->assertSame('30.00', $installments[1]->paid_amount);
        $this->assertDatabaseHas('investor_payment_allocations', [
            'investor_installment_id' => $installments[1]->id,
            'interest_amount' => 30,
            'principal_amount' => 0,
        ]);
        $this->assertSame(1920.0, (float) $this->cash->refresh()->current_balance);

        $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
            'cash_account_id' => $this->cash->id,
            'amount' => 1020.01,
            'paid_at' => '2026-03-15',
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
        ])->assertSessionHasErrors('amount');

        $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
            'cash_account_id' => $this->cash->id,
            'amount' => 1020,
            'paid_at' => '2026-03-15',
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
        ])->assertSessionHasNoErrors();

        $this->assertSame(InvestorContract::STATUS_SETTLED, $contract->refresh()->status);
        $this->assertSame(900.0, (float) $this->cash->refresh()->current_balance);
    }

    public function test_withholding_is_applied_on_interest_and_cash_out_is_the_net_amount(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor, [
            'principal_amount' => 1000,
            'rate_percent' => 10,
            'rate_period' => InvestorContract::RATE_TOTAL,
            'term_months' => 1,
            'payment_mode' => InvestorContract::MODE_BULLET,
            'withholding_percent' => 5,
        ]);

        $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
            'cash_account_id' => $this->cash->id,
            'amount' => 1100,
            'paid_at' => '2026-02-15',
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
        ])->assertSessionHasNoErrors();

        $payment = InvestorPayment::query()->firstOrFail();
        $this->assertSame('5.00', $payment->withholding_amount);
        $this->assertSame('1095.00', $payment->net_amount);
        $this->assertSame(905.0, (float) $this->cash->refresh()->current_balance);
    }

    public function test_payment_is_rejected_when_cash_balance_is_insufficient_or_currency_differs(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor, [
            'principal_amount' => 1000,
            'payment_mode' => InvestorContract::MODE_BULLET,
        ]);
        $emptyCash = CashAccount::create([
            'name' => 'Caja chica', 'type' => 'EFECTIVO', 'currency' => 'PEN',
            'initial_balance' => 0, 'current_balance' => 10, 'is_active' => true,
        ]);
        $dollarCash = CashAccount::create([
            'name' => 'Cuenta USD', 'type' => 'BANCO', 'currency' => 'USD',
            'initial_balance' => 5000, 'current_balance' => 5000, 'is_active' => true,
        ]);

        foreach ([$emptyCash, $dollarCash] as $cash) {
            $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
                'cash_account_id' => $cash->id,
                'amount' => 100,
                'paid_at' => '2026-02-15',
                'payment_method' => 'EFECTIVO',
                'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
            ])->assertSessionHasErrors('cash_account_id');
        }

        $this->assertSame(0, InvestorPayment::query()->count());
    }

    public function test_voiding_a_payment_reverts_installments_cash_and_settled_status(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor, [
            'principal_amount' => 1000,
            'rate_percent' => 10,
            'rate_period' => InvestorContract::RATE_TOTAL,
            'payment_mode' => InvestorContract::MODE_BULLET,
        ]);

        $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
            'cash_account_id' => $this->cash->id,
            'amount' => 1100,
            'paid_at' => '2026-02-15',
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
        ])->assertSessionHasNoErrors();
        $this->assertSame(InvestorContract::STATUS_SETTLED, $contract->refresh()->status);

        $payment = InvestorPayment::query()->firstOrFail();

        $this->delete(route('inmopro.investor-payments.destroy', $payment), ['reason' => 'x'])
            ->assertSessionHasErrors('reason');

        $this->delete(route('inmopro.investor-payments.destroy', $payment), ['reason' => 'Pago duplicado'])
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($payment);
        $this->assertSame(InvestorContract::STATUS_ACTIVE, $contract->refresh()->status);
        $this->assertSame('0.00', $contract->installments()->first()->paid_amount);
        $this->assertSame(2000.0, (float) $this->cash->refresh()->current_balance);
        $this->assertDatabaseHas('cash_entries', ['investor_contract_id' => $contract->id, 'type' => 'INGRESO', 'amount' => 1100]);
    }

    public function test_contract_with_payments_cannot_be_voided_and_without_payments_reverses_income(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor, ['principal_amount' => 1000]);
        $this->assertSame(2000.0, (float) $this->cash->refresh()->current_balance);

        $this->post(route('inmopro.investor-contracts.payments.store', $contract), [
            'cash_account_id' => $this->cash->id,
            'amount' => 10,
            'paid_at' => '2026-02-15',
            'payment_method' => 'TRANSFERENCIA',
            'voucher_image' => UploadedFile::fake()->image('voucher.jpg'),
        ])->assertSessionHasNoErrors();

        $this->post(route('inmopro.investor-contracts.void', $contract), ['reason' => 'Error de registro'])
            ->assertSessionHasErrors('reason');

        $other = $this->createActiveContract($investor, ['principal_amount' => 500]);
        $this->post(route('inmopro.investor-contracts.void', $other), ['reason' => 'Error de registro'])
            ->assertSessionHasNoErrors();

        $this->assertSame(InvestorContract::STATUS_VOIDED, $other->refresh()->status);
        $this->assertSame(1990.0, (float) $this->cash->refresh()->current_balance);
        $this->assertSame(2, CashEntry::query()->where('investor_contract_id', $other->id)->count());
    }

    public function test_same_investor_can_have_several_contracts_with_separate_totals(): void
    {
        $investor = Investor::factory()->create();
        $first = $this->createActiveContract($investor, ['principal_amount' => 10000, 'rate_percent' => 12]);
        $second = $this->createActiveContract($investor, [
            'principal_amount' => 20000,
            'rate_percent' => 2,
            'rate_period' => InvestorContract::RATE_MONTHLY,
            'payment_mode' => InvestorContract::MODE_EQUAL,
            'term_months' => 6,
            'installments_count' => 6,
        ]);

        $this->assertNotSame($first->code, $second->code);
        $this->assertSame('1200.00', $first->total_interest);
        $this->assertSame('2400.00', $second->total_interest);

        $this->get(route('inmopro.investors.show', $investor))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/investors/show')
                ->has('contracts', 2));

        $this->get(route('inmopro.investors.index'))
            ->assertInertia(fn ($page) => $page
                ->where('investors.data.0.active_contracts_count', 2)
                ->where('summary.0.currency', 'PEN')
                ->where('summary.0.capital_outstanding', 30000)
                ->where('summary.0.interest_outstanding', 3600));
    }

    public function test_contract_pages_and_export_render(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor);

        $this->get(route('inmopro.investor-contracts.create', $investor))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/investors/contract-form'));

        $this->get(route('inmopro.investor-contracts.show', $contract))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/investors/contract-show')
                ->where('contract.outstanding', 59000)
                ->has('contract.installments', 12)
                ->has('cashAccounts', 1));

        $this->get(route('inmopro.investor-contracts.export', $contract))->assertOk();
        $this->get(route('inmopro.investor-contracts.edit', $contract))->assertRedirect();
    }

    public function test_command_marks_overdue_installments_of_active_contracts(): void
    {
        $investor = Investor::factory()->create();
        $contract = $this->createActiveContract($investor, ['received_at' => '2026-01-01', 'first_due_date' => '2026-01-15']);
        $contract->installments()->update(['status' => InstallmentStatus::PENDIENTE]);

        $this->artisan('receivables:mark-overdue-installments')->assertSuccessful();

        $this->assertGreaterThan(0, InvestorInstallment::query()->where('status', InstallmentStatus::VENCIDA)->count());
        $this->assertSame(0, InvestorInstallment::query()
            ->where('status', InstallmentStatus::VENCIDA)
            ->whereDate('due_date', '>=', today())
            ->count());
    }

    public function test_routes_are_forbidden_without_permission(): void
    {
        $user = User::factory()->create();
        $user->syncRoles([]);
        $investor = Investor::factory()->create();

        $this->actingAs($user)->get(route('inmopro.investors.index'))->assertForbidden();
        $this->actingAs($user)->get(route('inmopro.investors.show', $investor))->assertForbidden();
        $this->actingAs($user)->post(route('inmopro.investor-contracts.store', $investor), $this->contractPayload())->assertForbidden();
    }
}
