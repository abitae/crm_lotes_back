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
        $project = Project::query()->firstOrFail();
        $project->update(['location' => '-12.069872155122834, -75.21095243577143']);
        $this->actingAs($user);

        $response = $this->get(route('inmopro.lots.index', ['project_id' => $project->id]));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/inventory')
            ->has('lots')
            ->where('project.maps_url', 'https://www.google.com/maps/search/?api=1&query=-12.069872155122834%2C%20-75.21095243577143')
            ->where('project.location_label', 'Abrir en Google Maps'));
    }

    public function test_authenticated_users_can_create_lot_with_alphanumeric_number(): void
    {
        $user = User::factory()->create();
        $project = Project::query()->firstOrFail();
        $statusLibre = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->firstOrFail();
        $this->actingAs($user);

        $response = $this->post(route('inmopro.lots.store'), [
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '1a',
            'area' => 100,
            'price' => 25000,
            'lot_status_id' => $statusLibre->id,
        ]);

        $response->assertRedirect(route('inmopro.lots.index', ['project_id' => $project->id]));
        $this->assertDatabaseHas('lots', [
            'project_id' => $project->id,
            'block' => 'A',
            'number' => '1A',
        ]);
    }

    public function test_lot_number_rejects_spaces_and_symbols(): void
    {
        $user = User::factory()->create();
        $project = Project::query()->firstOrFail();
        $statusLibre = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->firstOrFail();
        $this->actingAs($user);

        $this->from(route('inmopro.lots.create'))
            ->post(route('inmopro.lots.store'), [
                'project_id' => $project->id,
                'block' => 'A',
                'number' => '1 A',
                'area' => 100,
                'price' => 25000,
                'lot_status_id' => $statusLibre->id,
            ])
            ->assertRedirect(route('inmopro.lots.create'))
            ->assertSessionHasErrors('number');
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

    public function test_updating_reserved_lot_to_transferred_without_date_fails(): void
    {
        $user = User::factory()->create();
        $statusReservado = LotStatus::where('code', LotStatus::CODE_RESERVADO)->firstOrFail();
        $transferidoId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->firstOrFail()->id;
        $lot = Lot::query()
            ->where('lot_status_id', $statusReservado->id)
            ->whereNotNull('advisor_id')
            ->firstOrFail();
        $this->actingAs($user);

        $this->from(route('inmopro.projects.show', $lot->project_id))
            ->patch(route('inmopro.lots.update', $lot), [
                'lot_status_id' => $transferidoId,
                'client_id' => $lot->client_id,
                'advisor_id' => $lot->advisor_id,
                'price' => $lot->price,
                'advance' => $lot->advance,
            ])
            ->assertRedirect(route('inmopro.projects.show', $lot->project_id))
            ->assertSessionHasErrors('notarial_transfer_date');

        $lot->refresh();
        $this->assertSame((int) $statusReservado->id, (int) $lot->lot_status_id);
    }

    public function test_updating_reserved_lot_to_transferred_settles_balance_and_creates_commissions(): void
    {
        $user = User::factory()->create();
        $statusReservado = LotStatus::where('code', LotStatus::CODE_RESERVADO)->firstOrFail();
        $transferidoId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->firstOrFail()->id;
        $lot = Lot::query()
            ->where('lot_status_id', $statusReservado->id)
            ->whereNotNull('advisor_id')
            ->whereNotNull('price')
            ->firstOrFail();
        $this->actingAs($user);

        $countBefore = Commission::where('lot_id', $lot->id)->count();

        $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $transferidoId,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
            'price' => $lot->price,
            'advance' => 0,
            'remaining_balance' => (float) $lot->price,
            'notarial_transfer_date' => '2026-06-01',
        ])->assertRedirect();

        $lot->refresh();
        $this->assertSame($transferidoId, (int) $lot->lot_status_id);
        $this->assertSame((string) $lot->price, (string) $lot->advance);
        $this->assertSame('0.00', (string) $lot->remaining_balance);
        $this->assertSame('2026-06-01', $lot->notarial_transfer_date?->toDateString());
        $this->assertGreaterThan($countBefore, Commission::where('lot_id', $lot->id)->count());
    }

    public function test_updating_libre_lot_to_transferred_fails(): void
    {
        $user = User::factory()->create();
        $statusLibre = LotStatus::where('code', LotStatus::CODE_LIBRE)->firstOrFail();
        $transferidoId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->firstOrFail()->id;
        $lot = Lot::query()
            ->where('lot_status_id', $statusLibre->id)
            ->firstOrFail();
        $this->actingAs($user);

        $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $transferidoId,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
            'notarial_transfer_date' => '2026-06-01',
        ])
            ->assertSessionHasErrors('lot_status_id');

        $lot->refresh();
        $this->assertSame((int) $statusLibre->id, (int) $lot->lot_status_id);
    }

    public function test_updating_transferred_lot_status_is_blocked(): void
    {
        $user = User::factory()->create();
        $transferidoId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->firstOrFail()->id;
        $statusReservado = LotStatus::where('code', LotStatus::CODE_RESERVADO)->firstOrFail();
        $lot = Lot::query()->where('lot_status_id', $transferidoId)->firstOrFail();
        $this->actingAs($user);

        $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $statusReservado->id,
            'client_id' => $lot->client_id,
            'advisor_id' => $lot->advisor_id,
        ])->assertSessionHasErrors('lot_status_id');

        $lot->refresh();
        $this->assertSame($transferidoId, (int) $lot->lot_status_id);
    }

    public function test_bulk_update_project_lot_to_transferred(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $project = Project::query()->firstOrFail();
        $statusReservado = LotStatus::where('code', LotStatus::CODE_RESERVADO)->firstOrFail();
        $transferidoId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->firstOrFail()->id;
        $lot = Lot::query()
            ->where('project_id', $project->id)
            ->where('lot_status_id', $statusReservado->id)
            ->whereNotNull('advisor_id')
            ->whereNotNull('price')
            ->firstOrFail();

        $this->from(route('inmopro.projects.show', $project))
            ->put(route('inmopro.projects.lots.bulk-update', $project), [
                'lots' => [[
                    'id' => $lot->id,
                    'lot_status_id' => $transferidoId,
                    'client_id' => $lot->client_id,
                    'advisor_id' => $lot->advisor_id,
                    'client_name' => $lot->client_name,
                    'client_dni' => $lot->client_dni,
                    'client_phone' => $lot->client_phone,
                    'block' => $lot->block,
                    'number' => $lot->number,
                    'area' => $lot->area,
                    'price' => $lot->price,
                    'advance' => $lot->advance,
                    'remaining_balance' => $lot->remaining_balance,
                    'payment_limit_date' => null,
                    'operation_number' => null,
                    'contract_date' => $lot->contract_date?->toDateString(),
                    'contract_number' => null,
                    'notarial_transfer_date' => '2026-06-15',
                    'observations' => $lot->observations,
                ]],
            ])
            ->assertRedirect(route('inmopro.projects.show', $project))
            ->assertSessionHas('success');

        $lot->refresh();
        $this->assertSame($transferidoId, (int) $lot->lot_status_id);
        $this->assertSame((string) $lot->price, (string) $lot->advance);
        $this->assertSame('0.00', (string) $lot->remaining_balance);
        $this->assertSame('2026-06-15', $lot->notarial_transfer_date?->toDateString());
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

    public function test_updating_lot_phone_only_persists_on_linked_client(): void
    {
        $user = User::factory()->create();
        $transferredId = LotStatus::where('code', LotStatus::CODE_TRANSFERIDO)->value('id');
        $lot = Lot::query()
            ->when($transferredId, fn ($q) => $q->where('lot_status_id', '!=', $transferredId))
            ->whereNotNull('client_id')
            ->firstOrFail();
        $client = Client::query()->findOrFail($lot->client_id);
        $client->update(['phone' => null]);
        $statusReservado = LotStatus::where('code', 'RESERVADO')->firstOrFail();
        $this->actingAs($user);

        $this->patch(route('inmopro.lots.update', $lot), [
            'lot_status_id' => $statusReservado->id,
            'client_id' => $client->id,
            'advisor_id' => $lot->advisor_id,
            'client_name' => $client->name,
            'client_dni' => $client->dni,
            'client_phone' => '987654321',
        ])->assertRedirect();

        $client->refresh();
        $this->assertSame('987654321', $client->phone);
    }

    public function test_bulk_update_project_lots_persists_client_phone(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $project = Project::query()->firstOrFail();
        $statusReservado = LotStatus::where('code', 'RESERVADO')->firstOrFail();
        $lot = Lot::query()
            ->where('project_id', $project->id)
            ->where('lot_status_id', $statusReservado->id)
            ->whereNotNull('client_id')
            ->firstOrFail();

        $client = Client::query()->findOrFail($lot->client_id);
        $client->update(['phone' => null]);

        $this->from(route('inmopro.projects.show', $project))
            ->put(route('inmopro.projects.lots.bulk-update', $project), [
                'lots' => [[
                    'id' => $lot->id,
                    'lot_status_id' => $statusReservado->id,
                    'client_id' => $client->id,
                    'advisor_id' => $lot->advisor_id,
                    'client_name' => $client->name,
                    'client_dni' => $client->dni,
                    'client_phone' => '912345678',
                    'block' => $lot->block,
                    'number' => $lot->number,
                    'area' => $lot->area,
                    'price' => $lot->price,
                    'advance' => $lot->advance,
                    'remaining_balance' => $lot->remaining_balance,
                    'payment_limit_date' => null,
                    'operation_number' => null,
                    'contract_date' => $lot->contract_date?->toDateString(),
                    'contract_number' => null,
                    'notarial_transfer_date' => null,
                    'observations' => $lot->observations,
                ]],
            ])
            ->assertRedirect(route('inmopro.projects.show', $project));

        $this->assertSame('912345678', $client->fresh()->phone);
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
