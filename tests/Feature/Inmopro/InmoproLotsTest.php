<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Client;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
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

class InmoproLotsTest extends TestCase
{
    use RefreshDatabase;

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
    }

    public function test_guests_cannot_visit_lots_index(): void
    {
        $response = $this->get(route('inmopro.lots.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_lots_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.lots.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('inmopro/inventory')->has('lots'));
    }

    public function test_authenticated_users_can_update_lot_status(): void
    {
        $user = User::factory()->create();
        $transferredId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->value('id');
        $lot = Lot::query()
            ->when($transferredId, fn ($q) => $q->where('lot_status_id', '!=', $transferredId))
            ->firstOrFail();
        $statusReservado = LotStatus::where('code', 'RESERVADO')->first();
        $this->actingAs($user);

        $response = $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $statusReservado->id,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
        ]);

        $response->assertRedirect();
        $lot->refresh();
        $this->assertSame((int) $statusReservado->id, (int) $lot->lot_status_id);
    }

    public function test_updating_lot_to_transferred_is_blocked_outside_transfer_flow(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('advisor_id')->where('lot_status_id', '!=', LotStatus::where('code', 'TRANSFERIDO')->first()?->id)->first();
        $this->assertNotNull($lot, 'Need a non-transferred lot with advisor');
        $transferidoId = LotStatus::where('code', 'TRANSFERIDO')->first()->id;
        $this->actingAs($user);

        $countBefore = Commission::where('lot_id', $lot->id)->count();
        $response = $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $transferidoId,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
        ]);

        $response->assertSessionHasErrors('lot_status_id');
        $lot->refresh();
        $countAfter = Commission::where('lot_id', $lot->id)->count();
        $this->assertNotSame((int) $transferidoId, (int) $lot->lot_status_id);
        $this->assertSame($countBefore, $countAfter, 'No deben crearse comisiones fuera del flujo de transferencia.');
    }

    public function test_updating_lot_with_new_client_name_only_creates_client(): void
    {
        $user = User::factory()->create();
        $transferredId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->value('id');
        $lot = Lot::query()
            ->when($transferredId, fn ($q) => $q->where('lot_status_id', '!=', $transferredId))
            ->firstOrFail();
        $statusReservado = LotStatus::where('code', 'RESERVADO')->first();
        $this->actingAs($user);

        $response = $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $statusReservado->id,
            'client_id' => null,
            'advisor_id' => $lot->advisor_id,
            'client_name' => 'Cliente Solo Nombre',
            'client_dni' => null,
            'client_phone' => null,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('clients', ['name' => 'Cliente Solo Nombre']);
        $newClient = Client::where('name', 'Cliente Solo Nombre')->first();
        $this->assertNull($newClient->dni);
        $this->assertNull($newClient->phone);
        $lot->refresh();
        $this->assertSame($newClient->id, $lot->client_id);
    }

    public function test_updating_lot_recalculates_remaining_balance_and_normalizes_dates(): void
    {
        $user = User::factory()->create();
        $transferredId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->value('id');
        $lot = Lot::query()
            ->when($transferredId, fn ($q) => $q->where('lot_status_id', '!=', $transferredId))
            ->firstOrFail();
        $statusReservado = LotStatus::where('code', 'RESERVADO')->firstOrFail();
        $this->actingAs($user);

        $response = $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $statusReservado->id,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
            'price' => 10000,
            'advance' => 2500,
            'remaining_balance' => 999999,
            'payment_limit_date' => '2026-03-21T14:30:00-05:00',
            'contract_date' => '2026-03-22T09:15:00-05:00',
            'notarial_transfer_date' => '2026-03-23T18:45:00-05:00',
        ]);

        $response->assertRedirect();
        $lot->refresh();

        $this->assertSame('7500.00', (string) $lot->remaining_balance);
        $this->assertSame('2026-03-21', $lot->payment_limit_date?->toDateString());
        $this->assertSame('2026-03-22', $lot->contract_date?->toDateString());
        $this->assertSame('2026-03-23', $lot->notarial_transfer_date?->toDateString());
    }

    public function test_bulk_update_project_lots_persists_multiple_rows(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $project = Project::query()->firstOrFail();
        $statusReservado = LotStatus::where('code', 'RESERVADO')->firstOrFail();
        $lots = Lot::query()
            ->where('project_id', $project->id)
            ->where('lot_status_id', $statusReservado->id)
            ->limit(2)
            ->get();

        $this->assertGreaterThanOrEqual(1, $lots->count());

        $payload = $lots->map(fn (Lot $lot) => [
            'id' => $lot->id,
            'lot_status_id' => $statusReservado->id,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
            'client_name' => $lot->client_name,
            'client_dni' => $lot->client_dni,
            'client_phone' => $lot->client_phone,
            'block' => $lot->block,
            'number' => $lot->number,
            'area' => $lot->area,
            'price' => 50000 + $lot->id,
            'advance' => 1000,
            'remaining_balance' => 49000 + $lot->id,
            'payment_limit_date' => null,
            'operation_number' => null,
            'contract_date' => null,
            'contract_number' => null,
            'notarial_transfer_date' => null,
            'observations' => 'Bulk test '.$lot->id,
        ])->all();

        $response = $this->from(route('inmopro.projects.show', $project))
            ->put(route('inmopro.projects.lots.bulk-update', $project), [
                'lots' => $payload,
            ]);

        $response->assertRedirect(route('inmopro.projects.show', $project));
        $response->assertSessionHas('success');

        foreach ($lots as $lot) {
            $lot->refresh();
            $this->assertSame('Bulk test '.$lot->id, $lot->observations);
            $this->assertSame((string) (50000 + $lot->id - 1000), (string) ((float) $lot->remaining_balance));
        }
    }
}
