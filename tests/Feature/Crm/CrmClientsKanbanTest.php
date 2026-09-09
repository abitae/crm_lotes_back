<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmClientsKanbanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(ClientStatusSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_advisor_can_move_own_client_to_active_status(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $newStatus = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'CONTACTADO')->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.clients.crm.update', $client), [
            'client_status_id' => $newStatus->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'client_status_id' => $newStatus->id,
        ]);

        $this->assertDatabaseHas('client_status_changes', [
            'client_id' => $client->id,
            'to_status_id' => $newStatus->id,
            'advisor_id' => $advisor->id,
        ]);
    }

    public function test_advisor_cannot_move_another_advisors_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $client = $this->createClientForAdvisor($otherAdvisor);
        $newStatus = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'CONTACTADO')->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.clients.crm.update', $client), [
            'client_status_id' => $newStatus->id,
        ])->assertNotFound();
    }

    public function test_advisor_cannot_move_client_to_inactive_status(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $inactiveStatus = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'CONTACTADO')->firstOrFail();
        $inactiveStatus->update(['is_active' => false]);

        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.clients.crm.update', $client), [
            'client_status_id' => $inactiveStatus->id,
        ])->assertSessionHasErrors('client_status_id');

        $this->assertDatabaseMissing('clients', [
            'id' => $client->id,
            'client_status_id' => $inactiveStatus->id,
        ]);
    }

    public function test_advisor_cannot_move_client_to_nonexistent_status(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.clients.crm.update', $client), [
            'client_status_id' => 999999,
        ])->assertSessionHasErrors('client_status_id');
    }

    public function test_advisor_cannot_move_client_to_another_advisors_status(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $foreignStatus = ClientStatus::query()->forAdvisor($otherAdvisor->id)->where('code', 'CONTACTADO')->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.clients.crm.update', $client), [
            'client_status_id' => $foreignStatus->id,
        ])->assertSessionHasErrors('client_status_id');
    }

    public function test_kanban_reports_column_counts_including_unassigned(): void
    {
        $this->withoutVite();

        $advisor = Advisor::firstOrFail();
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('is_active', true)->firstOrFail();

        for ($i = 0; $i < 2; $i++) {
            $this->createClientForAdvisor($advisor, 'PROPIO', [
                'name' => 'Con estado '.$i,
                'dni' => (string) (81100000 + $i),
                'phone' => '97700000'.$i,
                'email' => 'kanban-status-'.$i.'@test.com',
                'client_status_id' => $status->id,
            ]);
        }

        $this->createClientForAdvisor($advisor, 'PROPIO', [
            'name' => 'Sin estado',
            'dni' => '81100099',
            'phone' => '977000099',
            'email' => 'kanban-unassigned@test.com',
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('kanbanMeta.total', 3)
                ->where('kanbanMeta.shown', 3)
                ->where('kanbanMeta.counts.0', 1)
                ->where('kanbanMeta.counts.'.$status->id, 2));
    }

    public function test_kanban_render_limit_does_not_change_reported_total(): void
    {
        $this->withoutVite();

        $advisor = Advisor::firstOrFail();
        $type = ClientType::query()->where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $now = now();

        $rows = [];
        for ($i = 0; $i < 301; $i++) {
            $rows[] = [
                'name' => sprintf('Cliente tope %03d', $i),
                'dni' => (string) (83000000 + $i),
                'phone' => '912'.str_pad((string) $i, 6, '0', STR_PAD_LEFT),
                'client_type_id' => $type->id,
                'city_id' => $city->id,
                'advisor_id' => $advisor->id,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 100) as $chunk) {
            Client::query()->insert($chunk);
        }

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('kanbanMeta.total', 301)
                ->where('kanbanMeta.shown', 300)
                ->where('kanbanMeta.limit', 300)
                ->has('kanbanClients', 300));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createClientForAdvisor(Advisor $advisor, string $typeCode = 'PROPIO', array $overrides = []): Client
    {
        $type = ClientType::query()->where('code', $typeCode)->firstOrFail();
        $city = City::firstOrFail();

        return Client::create(array_merge([
            'name' => 'Cliente kanban test',
            'dni' => (string) (81000000 + $advisor->id),
            'phone' => '988888888',
            'email' => 'kanban'.$advisor->id.'@test.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ], $overrides));
    }
}
