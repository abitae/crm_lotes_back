<?php

namespace Tests\Feature\Api\Datero;

use App\Contracts\Google\GoogleIdTokenVerifier;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Datero;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DateroGoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'google.client_id' => 'test-web-client-id',
            'google.mobile.datero.ios_client_id' => 'test-ios-client-id',
            'google.mobile.datero.android_client_id' => 'test-android-client-id',
        ]);
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
        Notification::fake();
    }

    public function test_datero_can_register_with_google_and_pick_advisor(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::query()->where('is_active', true)->firstOrFail();

        $this->mock(GoogleIdTokenVerifier::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->andReturn([
                    'sub' => 'google-sub-new-datero',
                    'email' => 'nuevo.datero@test.com',
                    'name' => 'Nuevo Datero',
                    'email_verified' => true,
                ]);
        });

        $response = $this->postJson(route('api.v1.datero.auth.google.register'), [
            'id_token' => 'fake-token',
            'dni' => '77889900',
            'phone' => '999888777',
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
            'device_name' => 'Test Datero',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'datero' => ['id', 'email'], 'advisor' => ['id']]);

        $this->assertDatabaseHas('dateros', [
            'email' => 'nuevo.datero@test.com',
            'advisor_id' => $advisor->id,
            'dni' => '77889900',
        ]);
    }

    public function test_registration_lookup_endpoints_are_public(): void
    {
        $this->getJson(route('api.v1.datero.auth.cities'))
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->getJson(route('api.v1.datero.auth.advisors'))
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_existing_datero_can_login_with_google(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::query()->where('is_active', true)->firstOrFail();

        $datero = Datero::create([
            'advisor_id' => $advisor->id,
            'name' => 'Datero Google',
            'phone' => '999111222',
            'email' => 'datero.google@test.com',
            'city_id' => $city->id,
            'dni' => '44556677',
            'username' => 'datero_google',
            'pin' => '123456',
            'is_active' => true,
        ]);

        $this->mock(GoogleIdTokenVerifier::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->andReturn([
                    'sub' => 'google-sub-existing-datero',
                    'email' => 'datero.google@test.com',
                    'name' => 'Datero Google',
                    'email_verified' => true,
                ]);
        });

        $this->postJson(route('api.v1.datero.auth.google'), [
            'id_token' => 'fake-token',
        ])->assertOk()
            ->assertJsonPath('datero.id', $datero->id);
    }
}
