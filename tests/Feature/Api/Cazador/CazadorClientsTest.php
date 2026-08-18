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
use Illuminate\Support\Facades\DB;
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

    public function test_advisor_cannot_create_client_without_city(): void
    {
        $advisor = Advisor::firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Cliente Sin Ciudad',
                'dni' => '76543211',
                'phone' => '987654322',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['city_id']);

        $this->assertDatabaseMissing('clients', [
            'name' => 'Cliente Sin Ciudad',
            'advisor_id' => $advisor->id,
        ]);
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
        $existing->forceFill(['created_at' => '2026-08-17 10:00:00'])->saveQuietly();

        $duplicateMessage = 'Cliente ya registrado por '.$existing->advisor->name.' el 17/08/2026';

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Intento duplicado',
                'dni' => '87654321',
                'phone' => $existing->phone,
                'email' => 'dup@test.com',
                'city_id' => $city->id,
            ]);

        $response->assertUnprocessable()
            ->assertJsonPath('message', $duplicateMessage)
            ->assertJsonPath('errors.duplicate_registration.0', $duplicateMessage)
            ->assertJsonPath('errors.phone.0', $duplicateMessage);

        $this->assertDatabaseMissing('clients', [
            'name' => 'Intento duplicado',
            'advisor_id' => $advisor->id,
            'client_type_id' => $ownType->id,
        ]);
    }

    public function test_advisor_can_register_client_with_duplicate_dni_and_different_phone(): void
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
            ->assertCreated();

        $this->assertDatabaseHas('clients', [
            'name' => 'Otro nombre',
            'dni' => $existing->dni,
            'phone' => '911000999',
            'advisor_id' => $advisor->id,
        ]);
    }

    public function test_advisor_cannot_register_client_with_duplicate_phone_ignoring_formatting(): void
    {
        $ownerAdvisor = Advisor::firstOrFail();
        $advisor = Advisor::query()->whereKeyNot($ownerAdvisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $existing = Client::create([
            'name' => 'Cliente telefono formateado',
            'dni' => '11110003',
            'phone' => '980 111 222',
            'client_type_id' => $ownType->id,
            'advisor_id' => $ownerAdvisor->id,
            'city_id' => $city->id,
        ]);
        $existing->load('advisor');

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Mismo telefono sin espacios',
                'dni' => '87654322',
                'phone' => '+(980)-111 222',
                'city_id' => $city->id,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Cliente ya registrado por '.$existing->advisor->name.' el '.$existing->created_at->format('d/m/Y'))
            ->assertJsonPath('errors.phone.0', 'Cliente ya registrado por '.$existing->advisor->name.' el '.$existing->created_at->format('d/m/Y'))
            ->assertJsonPath('errors.duplicate_registration.0', 'Cliente ya registrado por '.$existing->advisor->name.' el '.$existing->created_at->format('d/m/Y'));
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

    public function test_advisor_cannot_update_client_without_city(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $token = $this->loginToken($advisor);

        $client = Client::create([
            'name' => 'Cliente Propio Sin Ciudad En Update',
            'dni' => '33445567',
            'phone' => '911222334',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Cliente Propio Sin Ciudad En Update',
                'dni' => '33445567',
                'phone' => '911222334',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['city_id']);
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

    public function test_advisor_cannot_update_client_with_another_clients_phone(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $token = $this->loginToken($advisor);

        $client = Client::create([
            'name' => 'Cliente a editar',
            'dni' => '11223345',
            'phone' => '933444556',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $existing = Client::create([
            'name' => 'Cliente con telefono ocupado',
            'dni' => '11223346',
            'phone' => '944 555 667',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $message = 'Cliente ya registrado por '.$advisor->name.' el '.$existing->created_at->format('d/m/Y');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.cazador.clients.update', $client), [
                'name' => 'Nombre no persistido',
                'dni' => '11223345',
                'phone' => '+(944)-555 667',
                'city_id' => $city->id,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', $message)
            ->assertJsonPath('errors.phone.0', $message);

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'name' => 'Cliente a editar',
            'phone' => '933444556',
        ]);
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

    public function test_index_cursor_paginates_more_than_two_thousand_clients_without_duplicates(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $now = now();

        foreach (array_chunk(range(1, 2105), 500) as $numbers) {
            DB::table('clients')->insert(array_map(fn (int $number): array => [
                'name' => sprintf('Carga masiva %04d', $number),
                'dni' => sprintf('7%07d', $number),
                'dni_normalized' => sprintf('7%07d', $number),
                'phone' => sprintf('9%08d', $number),
                'phone_normalized' => sprintf('9%08d', $number),
                'client_type_id' => $ownType->id,
                'advisor_id' => $advisor->id,
                'city_id' => $city->id,
                'created_at' => $now,
                'updated_at' => $now,
            ], $numbers));
        }

        $token = $this->loginToken($advisor);
        $cursor = null;
        $ids = [];

        do {
            $response = $this->withHeader('Authorization', 'Bearer '.$token)
                ->getJson(route('api.v1.cazador.clients.index', array_filter([
                    'search' => 'Carga masiva',
                    'cursor' => $cursor,
                ])))
                ->assertOk()
                ->assertJsonPath('meta.per_page', 50);

            $pageIds = collect($response->json('data'))->pluck('id')->all();
            $this->assertLessThanOrEqual(50, count($pageIds));
            $ids = [...$ids, ...$pageIds];
            $cursor = $response->json('meta.next_cursor');
        } while ($response->json('meta.has_more'));

        $this->assertCount(2105, $ids);
        $this->assertCount(2105, array_unique($ids));
        $this->assertNull($cursor);
    }

    public function test_index_validates_pagination_and_returns_a_lightweight_numeric_search(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::create([
            'name' => 'Cliente búsqueda numérica',
            'dni' => '44556677',
            'phone' => '+(980) 123-456',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
        ]);
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', ['search' => '980-123', 'per_page' => 1]))
            ->assertOk()
            ->assertJsonPath('data.0.id', $client->id)
            ->assertJsonMissingPath('data.0.lots')
            ->assertJsonMissingPath('data.0.email')
            ->assertJsonPath('meta.per_page', 1);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', ['search' => 'x']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', ['cursor' => 'invalido', 'per_page' => 101]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cursor', 'per_page']);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->json('token');
    }
}
