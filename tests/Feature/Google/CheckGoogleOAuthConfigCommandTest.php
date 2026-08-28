<?php

namespace Tests\Feature\Google;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckGoogleOAuthConfigCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_check_fails_when_google_client_id_missing(): void
    {
        config([
            'google.client_id' => null,
            'google.client_secret' => null,
        ]);

        $this->artisan('google:oauth-check --app=cazador')
            ->assertFailed();
    }

    public function test_oauth_check_passes_when_cazador_vars_present(): void
    {
        config([
            'google.client_id' => 'web-client-id.apps.googleusercontent.com',
            'google.client_secret' => 'secret',
            'services.google.redirect' => 'https://crm.test/crm/auth/google/callback',
            'google.calendar_redirect_uri' => 'https://crm.test/crm/google/calendar/callback',
            'google.mobile.cazador.ios_client_id' => 'ios-id.apps.googleusercontent.com',
            'google.mobile.cazador.android_client_id' => 'android-id.apps.googleusercontent.com',
        ]);

        $this->artisan('google:oauth-check --app=cazador')
            ->assertSuccessful();
    }
}
