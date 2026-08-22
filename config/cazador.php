<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Enlaces temporales para compartir assets de proyecto
    |--------------------------------------------------------------------------
    */

    'asset_share_link_ttl_hours' => (int) env('CAZADOR_ASSET_SHARE_TTL_HOURS', 48),

    'asset_share_link_max_assets' => (int) env('CAZADOR_ASSET_SHARE_MAX_ASSETS', 20),

    /*
    | URL base para firmar share_url (opcional). Útil si APP_URL no coincide con el
    | dominio público (p. ej. Laravel Cloud). Ej: https://inmopro.laravel.cloud
    */
    'asset_share_url_root' => env('CAZADOR_ASSET_SHARE_URL_ROOT'),

    'default_storage_disk' => env('FILESYSTEM_DISK', config('filesystems.default')),

    'project_asset_disk' => env('CAZADOR_PROJECT_ASSET_DISK', env('FILESYSTEM_DISK', config('filesystems.default'))),

    /*
    |--------------------------------------------------------------------------
    | Versión mínima / vigente de la app Cazador
    |--------------------------------------------------------------------------
    |
    | latest_* es el build publicado. min_* fuerza actualización (no puede
    | superar a latest). El cliente compara con versionCode / buildNumber.
    |
    */

    'android_latest_version_code' => (int) env('CAZADOR_ANDROID_LATEST_VERSION_CODE', 7),

    'android_min_version_code' => (int) env('CAZADOR_ANDROID_MIN_VERSION_CODE', 1),

    'android_store_url' => env(
        'CAZADOR_ANDROID_STORE_URL',
        'https://play.google.com/store/apps/details?id=com.abitae.app_cazador'
    ),

    'ios_latest_build_number' => (int) env('CAZADOR_IOS_LATEST_BUILD_NUMBER', 7),

    'ios_min_build_number' => (int) env('CAZADOR_IOS_MIN_BUILD_NUMBER', 1),

    'ios_store_url' => env('CAZADOR_IOS_STORE_URL', ''),

];
