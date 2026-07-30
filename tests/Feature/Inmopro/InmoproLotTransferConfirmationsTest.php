<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\User;
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
            );
    }

    public function test_index_can_filter_by_lot_status(): void
    {
        $user = $this->createTransferManager();
        $reservedLot = $this->makeReservedLot();
        $transferredLot = $this->makeTransferredLot(exceptIds: $reservedLot->id);
        $transferredLot->update(['block' => 'STATUSFILTER']);

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

    public function test_authorized_user_can_register_transfer_for_reserved_lot(): void
    {
        Storage::fake('public');

        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.transfer-confirmation.store', $lot), [
                'evidence_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertRedirect(route('inmopro.lot-transfer-confirmations.index'));

        $this->assertDatabaseHas('lot_transfer_confirmations', [
            'lot_id' => $lot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'requested_by' => $user->id,
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'lot_status_id' => $this->statusIds['TRANSFERIDO'],
        ]);
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
        $this->assertSame($this->statusIds['TRANSFERIDO'], (int) $lot->lot_status_id);
        $this->assertSame('10000.00', (string) $lot->advance);
        $this->assertSame('0.00', (string) $lot->remaining_balance);

        $this->assertGreaterThan(
            $countBefore,
            Commission::query()->where('lot_id', $lot->id)->count(),
            'Se deben crear comisiones al aprobar la transferencia.'
        );
    }

    public function test_rejecting_pending_transfer_returns_lot_to_reserved(): void
    {
        $user = $this->createTransferManager();
        $lot = $this->makeReservedLot();

        $lot->update([
            'lot_status_id' => $this->statusIds['TRANSFERIDO'],
        ]);

        $transfer = LotTransferConfirmation::create([
            'lot_id' => $lot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/test.png',
            'requested_by' => $user->id,
        ]);

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
        ]);
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
