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

    'project_asset_disk' => env('CAZADOR_PROJECT_ASSET_DISK', 'public'),

];
