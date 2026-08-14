<?php

namespace Tests\Feature\Api\Datero;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Datero;
use App\Models\Inmopro\Project;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DateroApiTest extends TestCase
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

    public function test_protected_routes_require_authentication(): void
    {
        $this->getJson(route('api.v1.datero.clients.index'))
            ->assertUnauthorized()
            ->assertJsonFragment(['message' => 'No autenticado.']);

        $this->getJson(route('api.v1.datero.projects.index'))
            ->assertUnauthorized()
            ->assertJsonFragment(['message' => 'No autenticado.']);
    }

    public function test_datero_can_login_and_receive_token_advisor_and_datero_payload(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_api_login', '44111222');

        $response = $this->postJson(route('api.v1.datero.auth.login'), [
            'username' => $datero->username,
            'pin' => '654321',
        ]);

        $response->assertOk()
            ->assertJsonPath('datero.username', 'datero_api_login')
            ->assertJsonPath('advisor.id', $advisor->id)
            ->assertJsonStructure(['token', 'datero', 'advisor']);

        $this->assertNotEmpty($response->json('token'));
        $this->assertStringContainsString($datero->fresh()->invite_token, (string) $response->json('datero.registration_url'));
        $this->assertStringContainsString('qr.png', (string) $response->json('datero.registration_qr_url'));
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_bad_pin', '44111223');

        $this->postJson(route('api.v1.datero.auth.login'), [
            'username' => $datero->username,
            'pin' => '000000',
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Credenciales inválidas.']);
    }

    public function test_login_fails_when_datero_is_inactive(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_inactive', '44111224', isActive: false);

        $this->postJson(route('api.v1.datero.auth.login'), [
            'username' => $datero->username,
            'pin' => '654321',
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Credenciales inválidas.']);
    }

    public function test_login_fails_when_assigned_advisor_is_inactive(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $advisor->update(['is_active' => false]);

        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_inactive_adv', '44111225');

        $this->postJson(route('api.v1.datero.auth.login'), [
            'username' => $datero->username,
            'pin' => '654321',
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Credenciales inválidas.']);

        $advisor->update(['is_active' => true]);
    }

    public function test_logout_invalidates_token(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_logout', '44111226');
        $token = $this->loginToken($datero);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.datero.auth.logout'))
            ->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.datero.me.show'))
            ->assertUnauthorized();
    }

    public function test_me_returns_datero_and_advisor(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_me', '44111227');
        $token = $this->loginToken($datero);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.datero.me.show'))
            ->assertOk()
            ->assertJsonPath('data.datero.username', 'datero_me')
            ->assertJsonPath('data.advisor.id', $advisor->id);
    }

    public function test_datero_can_list_projects_with_tour_360_url(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_projects', '44111240');
        $project = Project::query()->create([
            'name' => 'Proyecto datero 360',
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'is_active' => true,
            'tour_360_url' => 'https://example.test/tours/360/projects/1',
        ]);
        Project::query()->create([
            'name' => 'Inactivo',
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'is_active' => false,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($datero))
            ->getJson(route('api.v1.datero.projects.index'))
            ->assertOk()
            ->assertJsonPath('data.0.id', $project->id)
            ->assertJsonPath('data.0.name', $project->name)
            ->assertJsonPath('data.0.tour_360_url', $project->tour_360_url)
            ->assertJsonCount(1, 'data');
    }

    public function test_datero_can_change_pin_with_valid_current_pin(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_pin_ok', '44111228');
        $token = $this->loginToken($datero);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.datero.me.pin.update'), [
                'current_pin' => '654321',
                'pin' => '111111',
                'pin_confirmation' => '111111',
            ])
            ->assertOk()
            ->assertJsonFragment(['message' => 'PIN actualizado correctamente.']);

        $this->postJson(route('api.v1.datero.auth.login'), [
            'username' => 'datero_pin_ok',
            'pin' => '111111',
        ])->assertOk();
    }

    public function test_datero_cannot_change_pin_with_wrong_current_pin(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_pin_bad', '44111229');
        $token = $this->loginToken($datero);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.datero.me.pin.update'), [
                'current_pin' => '000000',
                'pin' => '111111',
                'pin_confirmation' => '111111',
            ])
            ->assertUnprocessable()
            ->assertJsonFragment(['message' => 'El PIN actual no es válido.']);
    }

    public function test_datero_can_list_cities(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_cities', '44111230');
        $token = $this->loginToken($datero);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.datero.cities.index'))
            ->assertOk()
            ->assertJsonStructure(['data'])
            ->assertJsonFragment(['id' => $city->id]);
    }

    public function test_datero_can_create_client_assigned_to_advisor_with_datero_type(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_clients', '44111231');
        $token = $this->loginToken($datero);
        $dateroType = ClientType::query()->where('code', 'DATERO')->firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.datero.clients.store'), [
                'name' => 'Cliente Datero API',
                'dni' => '55667788',
                'phone' => '900111222',
                'email' => 'cdatero@test.com',
                'city_id' => $city->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Cliente Datero API');

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente Datero API',
            'advisor_id' => $advisor->id,
            'client_type_id' => $dateroType->id,
            'registered_by_datero_id' => $datero->id,
            'city_id' => $city->id,
        ]);
    }

    public function test_datero_sees_only_own_registered_clients(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $dateroA = $this->makeDateroForAdvisor($advisor, $city, 'datero_a', '44111232');
        $dateroB = $this->makeDateroForAdvisor($advisor, $city, 'datero_b', '44111233');
        $dateroType = ClientType::query()->where('code', 'DATERO')->firstOrFail();

        $clientA = Client::create([
            'name' => 'Solo A',
            'dni' => '55667701',
            'phone' => '900111333',
            'client_type_id' => $dateroType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
            'registered_by_datero_id' => $dateroA->id,
        ]);

        Client::create([
            'name' => 'Solo B',
            'dni' => '55667702',
            'phone' => '900111334',
            'client_type_id' => $dateroType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
            'registered_by_datero_id' => $dateroB->id,
        ]);

        $tokenA = $this->loginToken($dateroA);

        $this->withHeader('Authorization', 'Bearer '.$tokenA)
            ->getJson(route('api.v1.datero.clients.index'))
            ->assertOk()
            ->assertJsonFragment(['name' => 'Solo A'])
            ->assertJsonMissing(['name' => 'Solo B']);

        $this->withHeader('Authorization', 'Bearer '.$tokenA)
            ->getJson(route('api.v1.datero.clients.show', $clientA))
            ->assertOk();

        $tokenB = $this->loginToken($dateroB);

        $this->withHeader('Authorization', 'Bearer '.$tokenB)
            ->getJson(route('api.v1.datero.clients.show', $clientA))
            ->assertNotFound();
    }

    public function test_datero_can_update_own_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_update', '44111234');
        $token = $this->loginToken($datero);
        $dateroType = ClientType::query()->where('code', 'DATERO')->firstOrFail();

        $client = Client::create([
            'name' => 'Nombre Viejo',
            'dni' => '55667703',
            'phone' => '900111335',
            'client_type_id' => $dateroType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
            'registered_by_datero_id' => $datero->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson(route('api.v1.datero.clients.update', $client), [
                'name' => 'Nombre Nuevo',
                'dni' => '55667703',
                'phone' => '900111335',
                'city_id' => $city->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nombre Nuevo');
    }

    public function test_inactive_datero_token_is_rejected(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDateroForAdvisor($advisor, $city, 'datero_token_dead', '44111235');
        $token = $this->loginToken($datero);

        $datero->update(['is_active' => false]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.datero.me.show'))
            ->assertUnauthorized();
    }

    private function makeDateroForAdvisor(Advisor $advisor, City $city, string $username, string $dni, bool $isActive = true): Datero
    {
        return Datero::create([
            'advisor_id' => $advisor->id,
            'name' => 'Datero Test',
            'phone' => '900000000',
            'email' => $username.'@test.com',
            'city_id' => $city->id,
            'dni' => $dni,
            'username' => $username,
            'pin' => '654321',
            'is_active' => $isActive,
        ]);
    }

    private function loginToken(Datero $datero): string
    {
        return $this->postJson(route('api.v1.datero.auth.login'), [
            'username' => $datero->username,
            'pin' => '654321',
        ])->json('token');
    }
}
