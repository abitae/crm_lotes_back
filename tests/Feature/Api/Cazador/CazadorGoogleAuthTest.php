<?php

namespace Tests\Feature\Api\Cazador;

use App\Contracts\Google\GoogleIdTokenVerifier;
use App\Models\Inmopro\Advisor;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class CazadorGoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'google.client_id' => 'test-web-client-id',
            'google.mobile.cazador.ios_client_id' => 'test-ios-client-id',
            'google.mobile.cazador.android_client_id' => 'test-android-client-id',
        ]);
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_advisor_can_login_with_google_id_token(): void
    {
        $advisor = Advisor::firstOrFail();

        $this->mock(GoogleIdTokenVerifier::class, function ($mock) use ($advisor): void {
            $mock->shouldReceive('verify')
                ->andReturn([
                    'sub' => 'google-sub-advisor-1',
                    'email' => strtolower((string) $advisor->email),
                    'name' => $advisor->name,
                    'email_verified' => true,
                ]);
        });

        $response = $this->postJson(route('api.v1.cazador.auth.google'), [
            'id_token' => 'fake-token',
            'device_name' => 'Test Cazador',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'advisor' => ['id', 'email', 'username']]);
    }

    public function test_unknown_google_email_is_rejected(): void
    {
        $this->mock(GoogleIdTokenVerifier::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->andReturn([
                    'sub' => 'google-sub-unknown',
                    'email' => 'desconocido@test.com',
                    'name' => 'Desconocido',
                    'email_verified' => true,
                ]);
        });

        $this->postJson(route('api.v1.cazador.auth.google'), [
            'id_token' => 'fake-token',
        ])->assertStatus(422)
            ->assertJson(['message' => 'Tu cuenta de Google no está asociada a un vendedor.']);
    }

    public function test_invalid_google_token_is_rejected(): void
    {
        $this->mock(GoogleIdTokenVerifier::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->andThrow(new InvalidArgumentException('Token de Google inválido.'));
        });

        $this->postJson(route('api.v1.cazador.auth.google'), [
            'id_token' => 'bad-token',
        ])->assertStatus(422);
    }
}
