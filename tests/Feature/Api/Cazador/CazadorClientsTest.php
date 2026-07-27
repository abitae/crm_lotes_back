<?php

namespace Tests\Feature\Api\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Datero;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CazadorClientsTest extends TestCase
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

    public function test_advisor_can_create_and_list_own_clients(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Cliente Cazador',
                'dni' => '76543210',
                'phone' => '987654321',
                'email' => 'cliente@cazador.test',
                'city_id' => $city->id,
            ])->assertCreated();

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente Cazador',
            'advisor_id' => $advisor->id,
            'client_type_id' => $ownType->id,
            'city_id' => $city->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index'))
            ->assertOk()
            ->assertJsonFragment(['name' => 'Cliente Cazador']);
    }

    public function test_advisor_cannot_register_client_with_duplicate_phone(): void
    {
        $ownerAdvisor = Advisor::firstOrFail();
        $advisor = Advisor::query()->whereKeyNot($ownerAdvisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $existing = Client::create([
            'name' => 'Cliente existente',
            'dni' => '11110001',
            'phone' => '980000099',
            'client_type_id' => $ownType->id,
            'advisor_id' => $ownerAdvisor->id,
            'city_id' => $city->id,
        ]);
        $existing->load('advisor');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Intento duplicado',
                'dni' => '87654321',
                'phone' => $existing->phone,
                'email' => 'dup@test.com',
                'city_id' => $city->id,
            ]);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.duplicate_registration.0', 'Cliente ya registrado por '.$existing->advisor->name);

        $this->assertDatabaseMissing('clients', [
            'name' => 'Intento duplicado',
            'advisor_id' => $advisor->id,
            'client_type_id' => $ownType->id,
        ]);
    }

    public function test_advisor_cannot_register_client_with_duplicate_dni(): void
    {
        $ownerAdvisor = Advisor::firstOrFail();
        $advisor = Advisor::query()->whereKeyNot($ownerAdvisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $existing = Client::create([
            'name' => 'Cliente con DNI',
            'dni' => '11110002',
            'phone' => '980000088',
            'client_type_id' => $ownType->id,
            'advisor_id' => $ownerAdvisor->id,
            'city_id' => $city->id,
        ]);
        $existing->load('advisor');

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Otro nombre',
                'dni' => $existing->dni,
                'phone' => '911000999',
                'city_id' => $city->id,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.duplicate_registration.0', 'Cliente ya registrado por '.$existing->advisor->name);
    }

    public function test_advisor_can_list_show_and_update_datero_clients_for_same_advisor(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $dateroType = ClientType::query()->where('code', 'DATERO')->firstOrFail();
        $token = $this->loginToken($advisor);

        $datero = Datero::create([
            'advisor_id' => $advisor->id,
            'name' => 'Datero Test Cazador',
            'phone' => '900000000',
            'email' => 'datero_cazador_client@test.com',
            'city_id' => $city->id,
            'dni' => '44119998',
            'username' => 'datero_cazador_clients_test',
            'pin' => '654321',
            'is_active' => true,
        ]);

        $client = Client::create([
            'name' => 'Cliente captado por datero',
            'dni' => '55667798',
            'phone' => '900222334',
            'client_type_id' => $dateroType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
            'registered_by_datero_id' => $datero->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index'))
            ->assertOk()
            ->assertJsonFragment(['name' => 'Cliente captado por datero'])
            ->assertJsonFragment(['code' => 'DATERO']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.show', $client))
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente captado por datero')
            ->assertJsonPath('data.client_type.code', 'DATERO')
            ->assertJsonPath('data.city_id', $city->id);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Datero editado por asesor',
                'dni' => '55667798',
                'phone' => '900222334',
                'city_id' => $city->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente Datero editado por asesor')
            ->assertJsonPath('data.city_id', $city->id);
    }

    public function test_advisor_can_update_propio_client_via_put_and_patch(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $token = $this->loginToken($advisor);

        $client = Client::create([
            'name' => 'Cliente Propio Editar',
            'dni' => '33445566',
            'phone' => '911222333',
            'email' => 'propio@test.com',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Propio Editado PUT',
                'dni' => '33445566',
                'phone' => '911222333',
                'email' => 'propio@test.com',
                'city_id' => $city->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente Propio Editado PUT')
            ->assertJsonPath('data.city_id', $city->id);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Propio Editado PATCH',
                'dni' => '33445566',
                'phone' => '911222333',
                'email' => 'propio@test.com',
                'city_id' => $city->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente Propio Editado PATCH');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'name' => 'Cliente Propio Editado PATCH',
            'phone' => '911222333',
        ]);
    }

    public function test_advisor_can_update_client_with_nested_city_payload(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $token = $this->loginToken($advisor);

        $client = Client::create([
            'name' => 'Cliente Ciudad Anidada',
            'dni' => '77889900',
            'phone' => '922333444',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Ciudad Objeto',
                'dni' => '77889900',
                'phone' => '922333444',
                'city_id' => [
                    'id' => $city->id,
                    'name' => $city->name,
                    'department' => $city->department,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente Ciudad Objeto')
            ->assertJsonPath('data.city_id', $city->id);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Ciudad Campo',
                'dni' => '77889900',
                'phone' => '922333444',
                'city' => [
                    'id' => $city->id,
                    'name' => $city->name,
                    'department' => $city->department,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente Ciudad Campo')
            ->assertJsonPath('data.city_id', $city->id);
    }

    public function test_advisor_can_update_own_client_keeping_same_phone_and_dni(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $token = $this->loginToken($advisor);

        $client = Client::create([
            'name' => 'Cliente Sin Falso Duplicado',
            'dni' => '11223344',
            'phone' => '933444555',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Renombrado',
                'dni' => '11223344',
                'phone' => '933444555',
                'city_id' => $city->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cliente Renombrado')
            ->assertJsonMissingPath('errors.duplicate_registration');
    }

    public function test_index_filters_by_client_type_propio(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $dateroType = ClientType::query()->where('code', 'DATERO')->firstOrFail();
        $token = $this->loginToken($advisor);

        Client::create([
            'name' => 'Solo Propio Lista',
            'dni' => '20000001',
            'phone' => '900000011',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Solo Datero Lista',
            'dni' => '20000002',
            'phone' => '900000022',
            'client_type_id' => $dateroType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', ['client_type' => 'PROPIO']))
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Solo Propio Lista', $names);
        $this->assertNotContains('Solo Datero Lista', $names);
    }

    public function test_index_filters_by_client_type_datero(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $dateroType = ClientType::query()->where('code', 'DATERO')->firstOrFail();
        $token = $this->loginToken($advisor);

        Client::create([
            'name' => 'Propio Para Filtro Datero',
            'dni' => '20000003',
            'phone' => '900000033',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Datero Para Filtro Datero',
            'dni' => '20000004',
            'phone' => '900000044',
            'client_type_id' => $dateroType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', ['client_type' => 'DATERO']))
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertNotContains('Propio Para Filtro Datero', $names);
        $this->assertContains('Datero Para Filtro Datero', $names);
    }

    public function test_index_accepts_search_with_client_type(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $token = $this->loginToken($advisor);

        Client::create([
            'name' => 'Busqueda Alfa Propio',
            'dni' => '20000005',
            'phone' => '900000055',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Busqueda Alfa Otro Propio',
            'dni' => '20000006',
            'phone' => '900000066',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', [
                'client_type' => 'PROPIO',
                'search' => 'Alfa Propio',
            ]))
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Busqueda Alfa Propio', $names);
        $this->assertNotContains('Busqueda Alfa Otro Propio', $names);
    }

    public function test_index_rejects_invalid_client_type(): void
    {
        $advisor = Advisor::firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', ['client_type' => 'OTRO']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_type']);
    }

    public function test_advisor_cannot_access_clients_from_another_advisor(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::create([
            'name' => 'Cliente Ajeno',
            'dni' => '10000001',
            'phone' => '900000001',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.clients.show', $client))
            ->assertNotFound();
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->json('token');
    }
}
