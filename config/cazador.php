<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Enlaces temporales para compartir assets de proyecto
    |--------------------------------------------------------------------------
    */

    'asset_share_link_ttl_hours' => (int) env('CAZADOR_ASSET_SHARE_TTL_HOURS', 48),

    'asset_share_link_max_assets' => (int) env('CAZADOR_ASSET_SHARE_MAX_ASSETS', 20),

];
