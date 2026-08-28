<?php

return [

    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),

    'redirect_uri' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/crm/auth/google/callback'),

    'calendar_redirect_uri' => env('GOOGLE_CALENDAR_REDIRECT_URI', env('APP_URL').'/crm/google/calendar/callback'),

    'calendar_enabled' => (bool) env('GOOGLE_CALENDAR_ENABLED', true),

    'mobile' => [
        'cazador' => [
            'ios_client_id' => env('GOOGLE_CAZADOR_IOS_CLIENT_ID'),
            'android_client_id' => env('GOOGLE_CAZADOR_ANDROID_CLIENT_ID'),
        ],
        'datero' => [
            'ios_client_id' => env('GOOGLE_DATERO_IOS_CLIENT_ID'),
            'android_client_id' => env('GOOGLE_DATERO_ANDROID_CLIENT_ID'),
        ],
    ],

    'scopes' => [
        'login' => [
            'openid',
            'email',
            'profile',
        ],
        'calendar' => [
            'https://www.googleapis.com/auth/calendar.events',
        ],
    ],

    'reminder_private_property' => 'inmopro_reminder_id',

];
