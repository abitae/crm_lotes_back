<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
    }

    public function test_authenticated_users_can_visit_accounts_receivable_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.accounts-receivable.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('inmopro/accounts-receivable')->has('lots'));
    }

    public function test_authenticated_users_can_create_installment_and_payment(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
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
        ])->assertRedirect();

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
}
