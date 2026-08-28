<?php

return [

    'app_id' => env('META_APP_ID'),
    'app_secret' => env('META_APP_SECRET'),
    'verify_token' => env('META_VERIFY_TOKEN', 'meta_webhook_verify'),
    'graph_version' => env('META_GRAPH_VERSION', 'v21.0'),
    'embedded_signup_config_id' => env('META_EMBEDDED_SIGNUP_CONFIG_ID'),

    'redirect_uri' => env('META_REDIRECT_URI', env('APP_URL').'/crm/meta/callback'),

    'token_encryption_key' => env('META_TOKEN_ENCRYPTION_KEY', env('APP_KEY')),

    'oauth_scopes' => [
        'pages_messaging',
        'pages_manage_metadata',
        'pages_read_engagement',
        'pages_show_list',
        'instagram_manage_messages',
        'instagram_basic',
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management',
    ],

    'webhook_queue' => env('META_WEBHOOK_QUEUE', 'default'),

    'channels' => [
        'whatsapp' => 'whatsapp',
        'messenger' => 'messenger',
        'instagram' => 'instagram',
    ],

];
