<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Notifications\Crm\AdvisorPinResetNotification;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class CrmForgotPinTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
        Cache::flush();
    }

    public function test_advisor_can_request_a_pin_reset_link(): void
    {
        Notification::fake();

        $advisor = Advisor::firstOrFail();

        $this->post(route('crm.forgot-pin.store'), [
            'email' => $advisor->email,
        ])->assertSessionHas('status');

        Notification::assertSentTo($advisor, AdvisorPinResetNotification::class);
    }

    public function test_requesting_a_reset_for_an_unknown_email_gives_the_same_response(): void
    {
        Notification::fake();

        $this->post(route('crm.forgot-pin.store'), [
            'email' => 'no-existe@example.com',
        ])->assertSessionHas('status');

        Notification::assertNothingSent();
    }

    public function test_advisor_can_reset_pin_with_a_valid_token_and_login_with_it(): void
    {
        $advisor = Advisor::firstOrFail();

        $token = Password::broker('advisors')->createToken($advisor);

        $this->post(route('crm.reset-pin.store'), [
            'token' => $token,
            'email' => $advisor->email,
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ])->assertRedirect(route('crm.login'));

        $this->assertDatabaseHas('advisors', [
            'id' => $advisor->id,
            'must_change_pin' => false,
        ]);

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '654321',
        ])->assertRedirect(route('crm.dashboard'));
    }

    public function test_reset_fails_with_an_invalid_token(): void
    {
        $advisor = Advisor::firstOrFail();

        $this->post(route('crm.reset-pin.store'), [
            'token' => 'not-a-real-token',
            'email' => $advisor->email,
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ])->assertSessionHasErrors('email');

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '654321',
        ])->assertSessionHasErrors('username');
    }
}
