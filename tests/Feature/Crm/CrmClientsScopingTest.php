<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmClientsScopingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_advisor_can_create_and_view_own_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $response = $this->post(route('crm.clients.store'), [
            'name' => 'Cliente CRM',
            'dni' => '76543210',
            'phone' => '987654321',
            'email' => 'cliente@crm.test',
            'city_id' => $city->id,
        ]);

        $client = Client::where('name', 'Cliente CRM')->firstOrFail();
        $response->assertRedirect(route('crm.clients.show', $client));

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente CRM',
            'advisor_id' => $advisor->id,
        ]);

        $this->get(route('crm.clients.show', $client))->assertOk();
    }

    public function test_advisor_cannot_view_another_advisors_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $client = Client::create([
            'name' => 'Cliente Ajeno',
            'dni' => '10000001',
            'phone' => '900000001',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.show', $client))->assertNotFound();
        $this->get(route('crm.clients.edit', $client))->assertNotFound();
        $this->put(route('crm.clients.update', $client), [
            'name' => 'Intento de edicion',
            'phone' => '900000001',
            'city_id' => $city->id,
        ])->assertNotFound();
    }

    public function test_advisor_cannot_register_client_with_duplicate_phone(): void
    {
        $ownerAdvisor = Advisor::firstOrFail();
        $advisor = Advisor::query()->whereKeyNot($ownerAdvisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        Client::create([
            'name' => 'Cliente existente',
            'dni' => '11110001',
            'phone' => '980000099',
            'client_type_id' => $ownType->id,
            'advisor_id' => $ownerAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.clients.store'), [
            'name' => 'Intento duplicado',
            'dni' => '87654321',
            'phone' => '980000099',
            'city_id' => $city->id,
        ])->assertSessionHasErrors(['phone', 'duplicate_registration']);

        $this->assertDatabaseMissing('clients', [
            'name' => 'Intento duplicado',
        ]);
    }

    public function test_index_only_lists_own_clients(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        Client::create([
            'name' => 'Cliente Propio Visible',
            'dni' => '20000001',
            'phone' => '900000011',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Cliente De Otro Vendedor',
            'dni' => '20000002',
            'phone' => '900000022',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.index'))->assertOk();
    }
}
