<?php

namespace Tests\Feature\Api\Cazador;

use Tests\TestCase;

class CazadorAppVersionTest extends TestCase
{
    public function test_app_version_is_public(): void
    {
        config([
            'cazador.android_latest_version_code' => 7,
            'cazador.android_min_version_code' => 4,
            'cazador.android_store_url' => 'https://play.google.com/store/apps/details?id=com.abitae.app_cazador',
            'cazador.ios_latest_build_number' => 7,
            'cazador.ios_min_build_number' => 2,
            'cazador.ios_store_url' => '',
        ]);

        $this->getJson(route('api.v1.cazador.app-version.show'))
            ->assertOk()
            ->assertJsonPath('android.latest_version_code', 7)
            ->assertJsonPath('android.min_version_code', 4)
            ->assertJsonPath('android.store_url', 'https://play.google.com/store/apps/details?id=com.abitae.app_cazador')
            ->assertJsonPath('ios.latest_build_number', 7)
            ->assertJsonPath('ios.min_build_number', 2)
            ->assertJsonPath('ios.store_url', '');
    }

    public function test_min_version_cannot_exceed_latest(): void
    {
        config([
            'cazador.android_latest_version_code' => 5,
            'cazador.android_min_version_code' => 9,
            'cazador.ios_latest_build_number' => 3,
            'cazador.ios_min_build_number' => 8,
        ]);

        $this->getJson(route('api.v1.cazador.app-version.show'))
            ->assertOk()
            ->assertJsonPath('android.min_version_code', 5)
            ->assertJsonPath('ios.min_build_number', 3);
    }
}
