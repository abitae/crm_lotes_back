<?php

namespace Tests\Feature;

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

class PublicDateroClientRegistrationTest extends TestCase
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

    public function test_valid_invite_token_renders_registration_form(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_public_invite', '55111222');

        $this->get(route('public.datero-registration.show', ['token' => $datero->invite_token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/datero-client-register')
                ->where('capturerName', $datero->name)
                ->has('cities')
                ->has('token'));
    }

    public function test_qr_png_returns_image_for_valid_invite(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_pub_qr_png', '55111227');

        $response = $this->get(route('public.datero-registration.qr', ['token' => $datero->invite_token]));

        $response->assertOk();
        $contentType = (string) $response->headers->get('Content-Type');
        $this->assertStringContainsString('image/png', $contentType);
        $this->assertGreaterThan(200, strlen((string) $response->getContent()));
    }

    public function test_qr_png_returns_404_for_unknown_token(): void
    {
        $this->get(route('public.datero-registration.qr', ['token' => '00000000-0000-4000-8000-000000000000']))
            ->assertNotFound();
    }

    public function test_unknown_token_renders_invalid_page(): void
    {
        $this->get(route('public.datero-registration.show', ['token' => '00000000-0000-4000-8000-000000000000']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/datero-invite-invalid'));
    }

    public function test_inactive_datero_shows_invalid_page(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_pub_inactive', '55111223');
        $token = $datero->invite_token;
        $datero->update(['is_active' => false]);

        $this->get(route('public.datero-registration.show', ['token' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/datero-invite-invalid'));
    }

    public function test_inactive_advisor_shows_invalid_page(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_pub_bad_adv', '55111224');
        $token = $datero->invite_token;
        $advisor->update(['is_active' => false]);

        $this->get(route('public.datero-registration.show', ['token' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/datero-invite-invalid'));
    }

    public function test_post_registers_datero_type_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_pub_post', '55111225');
        $dateroTypeId = ClientType::query()->where('code', 'DATERO')->value('id');

        $response = $this->post(route('public.datero-registration.store', ['token' => $datero->invite_token]), [
            'name' => 'Cliente Web QR',
            'dni' => '77889900',
            'phone' => '900888777',
            'email' => 'cliente.qr.web@test.com',
            'referred_by' => 'QR',
            'city_id' => $city->id,
        ]);

        $response->assertRedirect(route('public.datero-registration.show', ['token' => $datero->invite_token]))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente Web QR',
            'phone' => '900888777',
            'advisor_id' => $advisor->id,
            'client_type_id' => $dateroTypeId,
            'registered_by_datero_id' => $datero->id,
        ]);
    }

    public function test_post_rejects_duplicate_phone(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_pub_dup', '55111226');
        $dateroTypeId = ClientType::query()->where('code', 'DATERO')->value('id');

        Client::create([
            'name' => 'Existente',
            'dni' => '11223344',
            'phone' => '900777666',
            'email' => null,
            'referred_by' => null,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
            'client_type_id' => $dateroTypeId,
            'registered_by_datero_id' => null,
        ]);

        $this->from(route('public.datero-registration.show', ['token' => $datero->invite_token]))
            ->post(route('public.datero-registration.store', ['token' => $datero->invite_token]), [
                'name' => 'Otro',
                'phone' => '900777666',
                'city_id' => $city->id,
            ])
            ->assertSessionHasErrors('duplicate_registration');
    }

    public function test_post_requires_city(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $datero = $this->makeDatero($advisor, $city, 'datero_pub_no_city', '55111228');

        $this->from(route('public.datero-registration.show', ['token' => $datero->invite_token]))
            ->post(route('public.datero-registration.store', ['token' => $datero->invite_token]), [
                'name' => 'Cliente Web Sin Ciudad',
                'phone' => '900888778',
            ])
            ->assertSessionHasErrors('city_id');

        $this->assertDatabaseMissing('clients', [
            'name' => 'Cliente Web Sin Ciudad',
            'registered_by_datero_id' => $datero->id,
        ]);
    }

    private function makeDatero(Advisor $advisor, City $city, string $username, string $dni): Datero
    {
        return Datero::create([
            'advisor_id' => $advisor->id,
            'name' => 'Datero Public Test',
            'phone' => '900000001',
            'email' => $username.'@test.com',
            'city_id' => $city->id,
            'dni' => $dni,
            'username' => $username,
            'pin' => '654321',
            'is_active' => true,
        ]);
    }
}
