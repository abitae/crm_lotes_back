<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CrmAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->withoutVite();
    }

    public function test_crm_login_screen_is_separate_from_inmopro_login(): void
    {
        $this->get(route('crm.login'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('crm/auth/login'));

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('auth/login'));
    }

    public function test_advisor_can_login_with_username_and_pin_and_reach_dashboard(): void
    {
        $advisor = Advisor::firstOrFail();

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertRedirect(route('crm.dashboard'));

        $this->assertAuthenticated('advisor');

        $this->get(route('crm.dashboard'))->assertOk();
    }

    public function test_inactive_advisor_cannot_login(): void
    {
        $advisor = Advisor::firstOrFail();
        $advisor->forceFill(['is_active' => false])->save();

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertSessionHasErrors('username');

        $this->assertGuest('advisor');
    }

    public function test_invalid_pin_shows_validation_error(): void
    {
        $advisor = Advisor::firstOrFail();

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '000000',
        ])->assertSessionHasErrors('username');

        $this->assertGuest('advisor');
    }

    public function test_login_route_is_rate_limited_per_username_and_ip(): void
    {
        Cache::flush();

        $advisor = Advisor::firstOrFail();

        for ($i = 0; $i < 10; $i++) {
            $this->post(route('crm.login.store'), [
                'username' => $advisor->username,
                'pin' => '000000',
            ]);
        }

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '000000',
        ])->assertStatus(429);

        Cache::flush();
    }

    public function test_login_rate_limit_cannot_be_bypassed_by_rotating_ip(): void
    {
        Cache::flush();

        $advisor = Advisor::firstOrFail();

        // 20 failed attempts against the same username, each from a distinct IP, exhausts the
        // account-level limiter even though no single IP ever crosses its own per-IP threshold.
        for ($i = 0; $i < 20; $i++) {
            $this->call('POST', route('crm.login.store'), [
                'username' => $advisor->username,
                'pin' => '000000',
            ], [], [], ['REMOTE_ADDR' => '203.0.113.'.$i]);
        }

        $this->call('POST', route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '000000',
        ], [], [], ['REMOTE_ADDR' => '203.0.113.99'])->assertStatus(429);

        Cache::flush();
    }

    public function test_guest_middleware_redirects_authenticated_advisor_away_from_login(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.login'))->assertRedirect();
    }

    public function test_advisor_can_logout(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.logout'))->assertRedirect(route('crm.login'));

        $this->assertGuest('advisor');
    }

    public function test_unauthenticated_request_to_crm_dashboard_redirects_to_crm_login(): void
    {
        $this->get(route('crm.dashboard'))->assertRedirect(route('crm.login'));
    }

    public function test_web_guard_user_cannot_access_crm_routes(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('crm.dashboard'))->assertRedirect(route('crm.login'));
    }

    public function test_advisor_guard_cannot_access_inmopro_routes(): void
    {
        $advisor = Advisor::firstOrFail();

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertRedirect(route('crm.dashboard'));

        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }
}
