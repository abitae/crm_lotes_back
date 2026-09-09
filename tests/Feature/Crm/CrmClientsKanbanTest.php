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

    private function createClientForAdvisor(Advisor $advisor, string $typeCode = 'PROPIO'): Client
    {
        $type = ClientType::query()->where('code', $typeCode)->firstOrFail();
        $city = City::firstOrFail();

        return Client::create([
            'name' => 'Cliente kanban test',
            'dni' => (string) (81000000 + $advisor->id),
            'phone' => '988888888',
            'email' => 'kanban'.$advisor->id.'@test.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
