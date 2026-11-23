<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotHistory;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\LotTransferVoucher;
use App\Models\User;
use App\Services\Inmopro\CommissionService;
use App\Support\FileStorage;
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
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InmoproLotTransferConfirmationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var array<string, int>
     */
    private array $statusIds;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);

        $this->statusIds = [
            'RESERVADO' => (int) LotStatus::query()->where('code', 'RESERVADO')->value('id'),
            'TRANSFERIDO' => (int) LotStatus::query()->where('code', 'TRANSFERIDO')->value('id'),
            'CUOTAS' => (int) LotStatus::query()->where('code', 'CUOTAS')->value('id'),
        ];
    }

    public function test_authorized_user_can_visit_transfer_confirmations_index(): void
    {
        $user = $this->createTransferManager();

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->has('lots')
                ->has('lotStatuses', 3)
                ->where('filters.project_id', null)
                ->where('filters.lot_status_id', null)
                ->where('filters.search', null)
                ->where('filters.advisor_id', null)
                ->where('filters.pending_review', null)
                ->where('filters.date_field', 'contract_date')
                ->where('filters.date_from', null)
                ->where('filters.date_to', null)
                ->where('lots.per_page', 15)
                ->where('lots.current_page', 1)
            );
    }

    public function test_index_can_filter_by_lot_status(): void
    {
        $user = $this->createTransferManager();
        $reservedLot = $this->makeReservedLot();
        $transferredLot = $this->makeTransferredLot(exceptIds: $reservedLot->id);
        $transferredLot->update([
            'block' => 'STATUSFILTER',
            'notarial_transfer_date' => '2026-04-15',
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'lot_status_id' => $this->statusIds['TRANSFERIDO'],
                'search' => 'STATUSFILTER',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->where('filters.lot_status_id', (string) $this->statusIds['TRANSFERIDO'])
                ->where('filters.search', 'STATUSFILTER')
                ->where('lots.total', 1)
                ->where('lots.data.0.id', $transferredLot->id)
                ->where('lots.data.0.notarial_transfer_date', fn (mixed $value): bool => str_starts_with((string) $value, '2026-04-15'))
            );

        $this->assertNotSame($reservedLot->id, $transferredLot->id);
    }

    public function test_index_can_filter_only_pending_reviews(): void
    {
        $user = $this->createTransferManager();
        $pendingLot = $this->makeTransferredLot();
        $approvedLot = $this->makeTransferredLot(exceptIds: $pendingLot->id);

        $this->createTransferConfirmation($pendingLot, LotTransferConfirmation::STATUS_PENDING, $user);
        $this->createTransferConfirmation($approvedLot, LotTransferConfirmation::STATUS_APPROVED, $user);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'pending_review' => '1',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->where('filters.pending_review', '1')
                ->where('lots.total', 1)
                ->where('lots.data.0.id', $pendingLot->id)
                ->where('lots.data.0.latest_transfer_confirmation.status', LotTransferConfirmation::STATUS_PENDING)
            );
    }

    public function test_index_can_filter_by_advisor(): void
    {
        $user = $this->createTransferManager();
        $advisorMatch = Advisor::query()->firstOrFail();
        $advisorOther = Advisor::query()->whereKeyNot($advisorMatch->id)->firstOrFail();
        $advisorMatch->update(['first_name' => 'Asesor Alpha', 'last_name' => null]);
        $advisorOther->update(['first_name' => 'Asesor Beta', 'last_name' => null]);

        $matchingLot = $this->makeReservedLot(advisor: $advisorMatch);
        $matchingLot->update(['block' => 'ALPHAONLY']);
        $this->makeReservedLot(exceptIds: $matchingLot->id, advisor: $advisorOther);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'search' => 'ALPHAONLY',
                'advisor_id' => $advisorMatch->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->where('filters.search', 'ALPHAONLY')
                ->where('filters.advisor_id', (string) $advisorMatch->id)
                ->where('lots.total', 1)
                ->where('lots.data.0.id', $matchingLot->id)
                ->where('lots.data.0.advisor.name', 'Asesor Alpha')
            );
    }

    public function test_index_preserves_filter_values_in_inertia_props(): void
    {
        $user = $this->createTransferManager();
        $advisor = Advisor::query()->firstOrFail();
        $advisor->update(['first_name' => 'Asesor Gamma', 'last_name' => null]);
        $lot = $this->makeTransferredLot(advisor: $advisor);
        $lot->update(['block' => 'GAMMAONLY']);
        $this->createTransferConfirmation($lot, LotTransferConfirmation::STATUS_PENDING, $user);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'project_id' => $lot->project_id,
                'lot_status_id' => $this->statusIds['TRANSFERIDO'],
                'search' => 'GAMMAONLY',
                'advisor_id' => $advisor->id,
                'pending_review' => '1',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->has('lotStatuses', 3)
                ->where('filters.project_id', (string) $lot->project_id)
                ->where('filters.lot_status_id', (string) $this->statusIds['TRANSFERIDO'])
                ->where('filters.search', 'GAMMAONLY')
                ->where('filters.advisor_id', (string) $advisor->id)
                ->where('filters.pending_review', '1')
                ->where('lots.total', 1)
                ->where('lots.data.0.id', $lot->id)
            );
    }

    public function test_index_can_filter_by_date_range_and_paginates(): void
    {
        $user = $this->createTransferManager();
        $inside = $this->makeReservedLot();
        $inside->update([
            'block' => 'DATEIN',
            'contract_date' => '2026-03-10',
            'payment_limit_date' => '2026-06-01',
        ]);
        $outside = $this->makeReservedLot(exceptIds: $inside->id);
        $outside->update([
            'block' => 'DATEOUT',
            'contract_date' => '2026-01-02',
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'date_field' => 'contract_date',
                'date_from' => '2026-03-01',
                'date_to' => '2026-03-31',
                'search' => 'DATEIN',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.date_field', 'contract_date')
                ->where('filters.date_from', '2026-03-01')
                ->where('filters.date_to', '2026-03-31')
                ->where('lots.total', 1)
                ->where('lots.data.0.id', $inside->id)
            );

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'date_field' => 'contract_date',
                'date_from' => '2026-03-01',
                'date_to' => '2026-03-31',
                'search' => 'DATEOUT',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('lots.total', 0)
            );

        Lot::query()->limit(16)->get()->each(function (Lot $lot): void {
            $lot->update(['lot_status_id' => $this->statusIds['RESERVADO']]);
        });

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'page' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('lots.per_page', 15)
                ->where('lots.current_page', 2)
                ->where('lots.last_page', fn (mixed $lastPage): bool => (int) $lastPage >= 2)
            );
    }

    public function test_index_rejects_an_inverted_date_range(): void
    {
        $user = $this->createTransferManager();

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'date_from' => '2026-04-10',
                'date_to' => '2026-04-01',
            ]))
            ->assertSessionHasErrors('date_to');
    }

    public function test_authorized_user_can_register_transfer_for_reserved_lot(): void
    {
        Storage::fake('public');

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                ...$this->payerAndVouchersPayload(),
                'transfer_date' => '2026-09-30',
                'transfer_amount' => 12500,
            ])
            ->assertRedirect(route('inmopro.lot-transfer-confirmations.index'));

        $this->assertDatabaseHas('lot_transfer_confirmations', [
            'lot_id' => $lot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'requested_by' => $user->id,
        ]);

        $confirmation = LotTransferConfirmation::query()->where('lot_id', $lot->id)->firstOrFail();
        $this->assertSame('2026-09-30', $confirmation->transfer_date?->toDateString());
        $this->assertSame('12500.00', (string) $confirmation->transfer_amount);

        $lot->refresh();
        $this->assertSame($this->statusIds['TRANSFERIDO'], (int) $lot->lot_status_id);
        $this->assertSame('2026-09-30', $lot->notarial_transfer_date?->toDateString());
        $this->assertSame('12500.00', (string) $lot->sale_price);

        $lot->load('advisor.level');
        $directRate = (string) $lot->advisor->level->direct_rate;
        $direct = Commission::query()
            ->where('lot_id', $lot->id)
            ->where('type', 'DIRECTA')
            ->firstOrFail();

        $this->assertSame($lot->advisor_id, $direct->advisor_id);
        $this->assertSame(number_format(12500 * (float) $directRate / 100, 2, '.', ''), (string) $direct->amount);
        $this->assertSame('2026-09-30', $direct->date->toDateString());
        $this->assertSame('PENDIENTE', $direct->status->code);
    }

    public function test_transferred_lot_commission_is_listed_in_commissions_view(): void
    {
        Storage::fake('public');

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                ...$this->payerAndVouchersPayload(),
                'transfer_date' => '2026-09-30',
                'transfer_amount' => 12500,
            ])
            ->assertRedirect(route('inmopro.lot-transfer-confirmations.index'));

        $this->actingAs(User::factory()->create())
            ->get(route('inmopro.commissions.index', [
                'start_date' => '2026-09-01',
                'end_date' => '2026-09-30',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/commissions')
                ->where('commissions.data', fn ($data) => collect($data)->contains(
                    fn ($commission) => $commission['lot_id'] === $lot->id
                        && $commission['advisor_id'] === $lot->advisor_id
                        && $commission['type'] === 'DIRECTA'
                ))
            );
    }

    public function test_approving_transfer_does_not_duplicate_commissions_created_on_register(): void
    {
        Storage::fake('public');

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                ...$this->payerAndVouchersPayload(),
                'transfer_date' => '2026-09-30',
                'transfer_amount' => 12500,
            ]);

        $countAfterRegister = Commission::query()->where('lot_id', $lot->id)->count();
        $this->assertGreaterThan(0, $countAfterRegister);

        $transfer = LotTransferConfirmation::query()->where('lot_id', $lot->id)->firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.lot-transfer-confirmations.approve', $transfer), [
                'review_notes' => 'Conforme.',
            ]);

        $this->assertSame($countAfterRegister, Commission::query()->where('lot_id', $lot->id)->count());
    }

    public function test_sync_command_creates_missing_commissions_for_transferred_lots(): void
    {
        $lot = $this->makeReservedLot();
        $lot->update([
            'lot_status_id' => $this->statusIds['TRANSFERIDO'],
            'notarial_transfer_date' => '2026-08-15',
        ]);

        $this->assertFalse(Commission::query()->where('lot_id', $lot->id)->exists());

        $this->artisan('inmopro:sync-transferred-lot-commissions')->assertSuccessful();

        $direct = Commission::query()->where('lot_id', $lot->id)->where('type', 'DIRECTA')->firstOrFail();
        $this->assertSame('2026-08-15', $direct->date->toDateString());

        $count = Commission::query()->where('lot_id', $lot->id)->count();
        $this->artisan('inmopro:sync-transferred-lot-commissions')->assertSuccessful();
        $this->assertSame($count, Commission::query()->where('lot_id', $lot->id)->count());
    }

    public function test_approving_pending_transfer_marks_review_and_creates_commissions(): void
    {
        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $lot->update([
            'lot_status_id' => $this->statusIds['TRANSFERIDO'],
            'advance' => 1500,
            'remaining_balance' => 8500,
        ]);

        $transfer = LotTransferConfirmation::create([
            'lot_id' => $lot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/test.png',
            'transfer_date' => '2026-09-30',
            'transfer_amount' => 12000,
            'requested_by' => $user->id,
        ]);

        $countBefore = Commission::query()->where('lot_id', $lot->id)->count();

        $this->actingAs($user)
            ->post(route('inmopro.lot-transfer-confirmations.approve', $transfer), [
                'review_notes' => 'Se valida la evidencia y coincide con la operación.',
            ])
            ->assertRedirect(route('inmopro.lot-transfer-confirmations.index'));

        $this->assertDatabaseHas('lot_transfer_confirmations', [
            'id' => $transfer->id,
            'status' => LotTransferConfirmation::STATUS_APPROVED,
            'review_notes' => 'Se valida la evidencia y coincide con la operación.',
            'reviewed_by' => $user->id,
        ]);

        $lot->refresh();
        $lot->load('advisor.level');
        $this->assertSame($this->statusIds['TRANSFERIDO'], (int) $lot->lot_status_id);
        $this->assertSame('12000.00', (string) $lot->sale_price);
        $this->assertSame('12000.00', (string) $lot->advance);
        $this->assertSame('0.00', (string) $lot->remaining_balance);

        $this->assertGreaterThan(
            $countBefore,
            Commission::query()->where('lot_id', $lot->id)->count(),
            'Se deben crear comisiones al aprobar la transferencia.'
        );

        $directRate = (string) $lot->advisor->level->direct_rate;
        $expectedCommission = number_format(12000 * (float) $directRate / 100, 2, '.', '');

        $this->assertDatabaseHas('commissions', [
            'lot_id' => $lot->id,
            'advisor_id' => $lot->advisor_id,
            'type' => 'DIRECTA',
            'percentage' => $directRate,
            'amount' => $expectedCommission,
        ]);
    }

    public function test_rejecting_pending_transfer_returns_lot_to_reserved(): void
    {
        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $lot->update([
            'lot_status_id' => $this->statusIds['TRANSFERIDO'],
            'notarial_transfer_date' => '2026-09-30',
        ]);

        $transfer = LotTransferConfirmation::create([
            'lot_id' => $lot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/test.png',
            'transfer_date' => '2026-09-30',
            'requested_by' => $user->id,
        ]);

        app(CommissionService::class)->createCommissionsForTransferredLot($lot->fresh());
        $this->assertTrue(Commission::query()->where('lot_id', $lot->id)->exists());

        $this->actingAs($user)
            ->post(route('inmopro.lot-transfer-confirmations.reject', $transfer), [
                'rejection_reason' => 'Voucher ilegible',
            ])
            ->assertRedirect(route('inmopro.lot-transfer-confirmations.index'));

        $this->assertDatabaseHas('lot_transfer_confirmations', [
            'id' => $transfer->id,
            'status' => LotTransferConfirmation::STATUS_REJECTED,
            'reviewed_by' => $user->id,
            'rejection_reason' => 'Voucher ilegible',
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'lot_status_id' => $this->statusIds['RESERVADO'],
            'notarial_transfer_date' => null,
        ]);
        $this->assertFalse(
            Commission::query()->where('lot_id', $lot->id)->exists(),
            'Las comisiones pendientes se eliminan al rechazar la transferencia.'
        );
    }

    public function test_index_orders_lots_by_oldest_contract_and_payment_limit_dates(): void
    {
        $user = $this->createTransferManager();

        $oldest = $this->makeReservedLot();
        $oldest->update([
            'block' => 'SORT',
            'number' => '01',
            'contract_date' => '2026-01-10',
            'payment_limit_date' => '2026-02-10',
        ]);

        $middle = $this->makeReservedLot(exceptIds: $oldest->id);
        $middle->update([
            'block' => 'SORT',
            'number' => '02',
            'contract_date' => '2026-02-10',
            'payment_limit_date' => '2026-03-10',
        ]);

        $newest = $this->makeReservedLot(exceptIds: [$oldest->id, $middle->id]);
        $newest->update([
            'block' => 'SORT',
            'number' => '03',
            'contract_date' => '2026-03-10',
            'payment_limit_date' => '2026-04-10',
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'search' => 'SORT',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->where('lots.total', 3)
                ->where('lots.data.0.id', $oldest->id)
                ->where('lots.data.1.id', $middle->id)
                ->where('lots.data.2.id', $newest->id)
            );
    }

    public function test_index_lists_reserved_lots_before_transferred(): void
    {
        $user = $this->createTransferManager();

        $reserved = $this->makeReservedLot();
        $reserved->update([
            'block' => 'STATUSORD',
            'number' => '01',
            'contract_date' => '2026-06-01',
        ]);

        $transferred = $this->makeTransferredLot(exceptIds: $reserved->id);
        $transferred->update([
            'block' => 'STATUSORD',
            'number' => '02',
            'contract_date' => '2026-01-01',
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'search' => 'STATUSORD',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->where('lots.total', 2)
                ->where('lots.data.0.id', $reserved->id)
                ->where('lots.data.1.id', $transferred->id));
    }

    public function test_authorized_user_can_update_lot_queue_notes(): void
    {
        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->patch(route('inmopro.lots.transfer-queue-notes.update', $lot), [
                'notes' => 'Cliente solicita prorroga',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'notes' => 'Cliente solicita prorroga',
        ]);
    }

    public function test_authorized_user_can_update_notes_for_installments_lot(): void
    {
        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();
        $lot->update(['lot_status_id' => $this->statusIds['CUOTAS']]);

        $this->actingAs($user)
            ->patch(route('inmopro.lots.transfer-queue-notes.update', $lot), [
                'notes' => 'Seguimiento de cuotas',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'notes' => 'Seguimiento de cuotas',
        ]);
    }

    public function test_unauthorized_user_cannot_update_lot_queue_notes(): void
    {
        Permission::findOrCreate('inmopro.lot-transfer-confirmations.index', 'web');

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $unauthorizedUser = User::factory()->create();
        $unauthorizedUser->syncRoles([]);

        $this->actingAs($unauthorizedUser)
            ->patch(route('inmopro.lots.transfer-queue-notes.update', $lot), [
                'notes' => 'Intento no autorizado',
            ])
            ->assertForbidden();
    }

    public function test_authorized_user_can_export_transfer_queue_excel(): void
    {
        $user = $this->createTransferManager();
        $this->makeReservedLot();

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.export-excel'))
            ->assertOk()
            ->assertDownload('transferencias_lotes.xlsx');
    }

    public function test_index_includes_installments_lots(): void
    {
        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();
        $lot->update([
            'block' => 'CUOTASQ',
            'number' => '01',
            'lot_status_id' => $this->statusIds['CUOTAS'],
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-confirmations.index', [
                'search' => 'CUOTASQ',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lot-transfer-confirmations/index')
                ->where('lots.total', 1)
                ->where('lots.data.0.id', $lot->id)
                ->where('lots.data.0.status.code', 'CUOTAS'));
    }

    public function test_transfer_saves_payer_and_multiple_vouchers_and_history(): void
    {
        Storage::fake(FileStorage::disk());

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                'transfer_date' => '2026-10-05',
                'transfer_amount' => 15000,
                'payer_name' => 'María Quispe (hermana)',
                'payer_dni' => '44556677',
                'vouchers' => [
                    [
                        'image' => UploadedFile::fake()->image('v1.png'),
                        'bank' => 'BCP',
                        'amount' => 10000,
                        'operation_number' => 'OP-111',
                    ],
                    [
                        'image' => UploadedFile::fake()->image('v2.png'),
                        'bank' => LotTransferVoucher::BANK_OTHER,
                        'bank_other' => 'Caja Cusco',
                        'amount' => 4000,
                        'operation_number' => 'OP-222',
                    ],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('inmopro.lot-transfer-confirmations.index'));

        $confirmation = LotTransferConfirmation::query()->where('lot_id', $lot->id)->with('vouchers')->firstOrFail();
        $this->assertSame('María Quispe (hermana)', $confirmation->payer_name);
        $this->assertSame('44556677', $confirmation->payer_dni);
        $this->assertNull($confirmation->evidence_path);
        $this->assertCount(2, $confirmation->vouchers);

        [$first, $second] = $confirmation->vouchers->all();
        $this->assertSame('BCP', $first->bank_label);
        $this->assertSame('10000.00', (string) $first->amount);
        $this->assertSame('OP-111', $first->operation_number);
        $this->assertSame('Caja Cusco', $second->bank_label);
        $this->assertSame('4000.00', (string) $second->amount);
        Storage::disk(FileStorage::disk())->assertExists($first->image_path);
        Storage::disk(FileStorage::disk())->assertExists($second->image_path);

        $this->actingAs($user)
            ->get(route('inmopro.lot-transfer-vouchers.image', $first))
            ->assertOk();

        $history = LotHistory::query()
            ->where('lot_id', $lot->id)
            ->where('event', LotHistory::EVENT_TRANSFERRED)
            ->sole();
        $this->assertSame($user->id, $history->user_id);
        $this->assertSame($this->statusIds['RESERVADO'], $history->from_status_id);
        $this->assertSame($this->statusIds['TRANSFERIDO'], $history->to_status_id);
        $this->assertSame('María Quispe (hermana)', $history->meta['payer_name']);
        $this->assertFalse($history->meta['payer_is_client']);
        $this->assertCount(2, $history->meta['vouchers']);
    }

    public function test_transfer_requires_payer_and_complete_vouchers(): void
    {
        Storage::fake(FileStorage::disk());

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                'transfer_date' => '2026-10-05',
                'transfer_amount' => 15000,
            ])
            ->assertSessionHasErrors(['payer_name', 'vouchers']);

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                'transfer_date' => '2026-10-05',
                'transfer_amount' => 15000,
                'payer_name' => 'Cliente',
                'vouchers' => [
                    ['image' => UploadedFile::fake()->image('v1.png'), 'amount' => 100],
                    ['image' => UploadedFile::fake()->image('v2.png'), 'bank' => 'OTRO', 'amount' => 100, 'operation_number' => 'X1'],
                ],
            ])
            ->assertSessionHasErrors(['vouchers.0.bank', 'vouchers.0.operation_number', 'vouchers.1.bank_other']);

        $this->assertDatabaseCount('lot_transfer_confirmations', 0);
        $this->assertDatabaseCount('lot_transfer_vouchers', 0);
        $this->assertSame($this->statusIds['RESERVADO'], (int) $lot->refresh()->lot_status_id);
    }

    public function test_voucher_operation_number_cannot_be_reused_unless_transfer_was_rejected(): void
    {
        Storage::fake(FileStorage::disk());

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();
        $otherLot = $this->makeReservedLot($lot->id);

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), $this->transferPayload())
            ->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $otherLot), $this->transferPayload())
            ->assertSessionHasErrors('vouchers.0.operation_number');

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $otherLot), [
                ...$this->transferPayload(),
                'vouchers' => [
                    ['image' => UploadedFile::fake()->image('a.png'), 'bank' => 'BBVA', 'amount' => 10, 'operation_number' => 'DUP'],
                    ['image' => UploadedFile::fake()->image('b.png'), 'bank' => 'BBVA', 'amount' => 10, 'operation_number' => 'DUP'],
                ],
            ])
            ->assertSessionHasErrors('vouchers.1.operation_number');

        $transfer = LotTransferConfirmation::query()->where('lot_id', $lot->id)->firstOrFail();
        $this->actingAs($user)
            ->post(route('inmopro.lot-transfer-confirmations.reject', $transfer), [
                'rejection_reason' => 'Voucher de otro lote',
            ]);

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $otherLot), $this->transferPayload())
            ->assertSessionHasNoErrors();

        $rejectedHistory = LotHistory::query()
            ->where('lot_id', $lot->id)
            ->where('event', LotHistory::EVENT_TRANSFER_REJECTED)
            ->sole();
        $this->assertSame('Voucher de otro lote', $rejectedHistory->reason);
        $this->assertSame($this->statusIds['RESERVADO'], $rejectedHistory->to_status_id);
    }

    /**
     * @return array<string, mixed>
     */
    private function payerAndVouchersPayload(): array
    {
        return [
            'payer_name' => 'Cliente de prueba',
            'vouchers' => [
                [
                    'image' => UploadedFile::fake()->image('voucher.png'),
                    'bank' => 'BCP',
                    'amount' => 12500,
                    'operation_number' => 'OP-'.uniqid(),
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transferPayload(): array
    {
        return [
            'transfer_date' => '2026-10-05',
            'transfer_amount' => 9000,
            'payer_name' => 'Cliente',
            'vouchers' => [
                ['image' => UploadedFile::fake()->image('v.png'), 'bank' => 'INTERBANK', 'amount' => 9000, 'operation_number' => '998877'],
            ],
        ];
    }

    private function createTransferManager(): User
    {
        $user = User::factory()->create();
        $user->syncRoles([]);

        $names = [
            'inmopro.lot-transfer-confirmations.index',
            'inmopro.lots.transfer-confirmation',
            'inmopro.lots.transfer-confirmation.store',
            'inmopro.lot-transfer-confirmations.approve',
            'inmopro.lot-transfer-confirmations.reject',
        ];

        $permissions = collect($names)->map(fn (string $name) => Permission::findOrCreate($name, 'web'));

        $role = Role::firstOrCreate(
            ['name' => 'transfer-manager-test', 'guard_name' => 'web'],
        );
        $role->syncPermissions($permissions);
        $user->assignRole($role);

        return $user;
    }

    private function makeReservedLot(array|int|null $exceptIds = null, ?Advisor $advisor = null): Lot
    {
        $exceptIds = match (true) {
            $exceptIds === null => [],
            is_int($exceptIds) => [$exceptIds],
            default => $exceptIds,
        };

        $lot = Lot::query()
            ->when($exceptIds !== [], fn ($query) => $query->whereNotIn('id', $exceptIds))
            ->firstOrFail();
        $client = Client::query()->firstOrFail();
        $advisor ??= Advisor::query()->firstOrFail();

        $lot->update([
            'lot_status_id' => $this->statusIds['RESERVADO'],
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'client_name' => $client->name,
            'client_dni' => $client->dni,
            'price' => 10000,
            'list_price' => 10000,
            'sale_price' => 10000,
            'contract_date' => now()->toDateString(),
        ]);

        return $lot->fresh();
    }

    private function makeTransferredLot(array|int|null $exceptIds = null, ?Advisor $advisor = null): Lot
    {
        $lot = $this->makeReservedLot($exceptIds, $advisor);

        $lot->update([
            'lot_status_id' => $this->statusIds['TRANSFERIDO'],
        ]);

        return $lot->fresh();
    }

    private function createTransferConfirmation(Lot $lot, string $status, User $user): LotTransferConfirmation
    {
        return LotTransferConfirmation::create([
            'lot_id' => $lot->id,
            'status' => $status,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/test.png',
            'requested_by' => $user->id,
            'reviewed_by' => $status === LotTransferConfirmation::STATUS_PENDING ? null : $user->id,
            'reviewed_at' => $status === LotTransferConfirmation::STATUS_PENDING ? null : now(),
            'review_notes' => $status === LotTransferConfirmation::STATUS_APPROVED ? 'Validado' : null,
            'rejection_reason' => $status === LotTransferConfirmation::STATUS_REJECTED ? 'Observado' : null,
        ]);
    }
}
