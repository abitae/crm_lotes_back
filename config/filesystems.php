<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3", "gcs"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

        'gcs' => [
            'driver' => 'gcs',
            'key_file_path' => null,
            'key_file' => [
                'type' => env('GOOGLE_CLOUD_ACCOUNT_TYPE', 'service_account'),
                'private_key_id' => env('GOOGLE_CLOUD_PRIVATE_KEY_ID') ?? '2d5e49674e12ba582fba60f332546075e974a380',
                'private_key' => env('GOOGLE_CLOUD_PRIVATE_KEY') ?? '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIxzvIaOyP3CjU\nQeWmNmmuhpmpNgqMGyBxxrzedfh37yYJ1e7kwwASF9hsErVIHvOyKXXaN0rmhQ69\ndrQp+uvfrGQsRiSqI6ofVQmKHbKaoQJj02xuwxtzMlramPaG+knBJKfGgBugv+gu\naK3kRx4VRTKdWpBY/hWzAGDFj9b/T0BoRQ0xPqhaE3XSQQ3txq9Izv+sfvG/mGXP\nv/IOi9RdFERVRt2hv6DJm1+cv/9Fnhotq8/FuNN0PVjTiuz0UlfuX4tyUHx0Wmjs\nz+hHcyw3cqvrrbVBV0WFtPRIjzuIQILnN4BxRsUIlriOJ3EM75pFyN9cyMmhoaD0\n/NGCaJvZAgMBAAECggEASA3UIxqglwpELtSNVYaei68rcyH9TAWqMZrIii+dIXGW\nXZ5Ekx12J4geN77JBx5wh6ZAcLU6MJtczFrO0mgGAWoNMyRjIRoWghMTDtmUkNCq\nmme0ONXVQpS2LVAK3SrykBmXCnJMN/bXHNydV1i8b5a7UORA/GcHI4vFrvDtkAbe\nifUXWP5YA3aJiO0KhzhK9Wx1telOuJhSmUKQhRsS4cpka3gY2hoLkr+KQDKCfyBd\nSMI/RUI4yfL7Zzb7fgaHd8bKq3oqlNfNMpWFGhj6UI87JoSZw+l9idiLoi7hA+93\nlBuZjhNbNpk9uvjFiRJCnBgg+iaWD33lsqriyAuNpwKBgQDwv3BSUQ+G3kPFKXMj\ntFq7VuLlIdbxZx5FNh6hBD30J/LxemfVImzSki9vvQ+SRzPeP2h8z7KljeO1kNo/\noWGKwLSU95Dl81o8t3O/DwiQjDTQKSCgSJxO/5VC/pvGBh2hQkT1r+oqJ9ROHFI3\nRjdHMoHGylOnD3gK+T4paV2r/wKBgQDVf4y90Epf9TN5evq7k1i9W0DYGoBUvulS\neO5ax7Syejj31u5KNfv3ZouStGBmcfvLbSIkX/xUBtJEi9BkeS7ydGuVG8bXgxHs\nzTExLPycAuk5GnwkddGSIFSK+P8skqBoYkAMo6BCq3ar/UOxeco9Et3wcWqtl+0h\nfYriePyYJwKBgQCzQBbFc414Aa278yzDfNnBeuPdbuC3ROwI5E7R3HK0g7ojidwd\nmVAlSKsBK2eYpmM8K0IFDDAbjBXrbjrR/bq+sNTDxcChNhwN8RnBO9RIq9v20Wh1\nbxrSxwG/rAsX2h3dn5XwyFY1pQoyTmv4s9Mcs8Jk3OiEDsR2hzV9Z/JSyQKBgCzM\nrwPFiVXJZhu/qo1hxeU2GM1AAl3GEb+0kI+MCGbLLtkSyL3Zxh2L7w3Bu9jDYkq1\ng8yON6yKIeUwUXJD244Uz95iDb97SW+fPwtKnVc/ZSEOZa5g6rD3B8aBqUn5Gp/M\nvhPo4eAbirNcWbAMFlvqcZfatL/oeWHlrhcHvDlRAoGAVNsj3iGhXHEikQGx0Zb6\ntE1/tKYvOxRVmBy+Pm61++PRDOZdCQk/eDWseEZlbX+UQEuAeSkNb/+qDn8wRmzn\nJnRlbA2MjfjW6xzBVULp9WXwcdlIOJ9opak4GwLpDD1wmVyrI4kYW/jTdoryGjhM\nGO05fJe/Aecl0ziJ4cwkdjI=\n-----END PRIVATE KEY-----\n',
                'client_email' => env('GOOGLE_CLOUD_CLIENT_EMAIL') ?? 'storage-cuenta@hip-heading-449219-p2.iam.gserviceaccount.com',
                'client_id' => env('GOOGLE_CLOUD_CLIENT_ID') ?? '106456527129567256943',
                'auth_uri' => env('GOOGLE_CLOUD_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
                'token_uri' => env('GOOGLE_CLOUD_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
                'auth_provider_x509_cert_url' => env('GOOGLE_CLOUD_AUTH_PROVIDER_CERT_URL') ?? 'https://www.googleapis.com/oauth2/v1/certs',
                'client_x509_cert_url' => env('GOOGLE_CLOUD_CLIENT_CERT_URL') ?? 'https://www.googleapis.com/robot/v1/metadata/x509/storage-cuenta%40hip-heading-449219-p2.iam.gserviceaccount.com',
            ],
            'project_id' => env('GOOGLE_CLOUD_PROJECT_ID') ?? 'hip-heading-449219-p2',
            'bucket' => env('GOOGLE_CLOUD_STORAGE_BUCKET') ?? 'storage_abitae',
            'path_prefix' => env('GOOGLE_CLOUD_STORAGE_PATH_PREFIX') ?? 'lotes',
            'url' => env('GOOGLE_CLOUD_STORAGE_URL'),
            'storage_api_uri' => env('GOOGLE_CLOUD_STORAGE_API_URI'),
            'api_endpoint' => env('GOOGLE_CLOUD_STORAGE_API_ENDPOINT', 'https://storage.googleapis.com'),
            'visibility' => 'public',
            'metadata' => ['cacheControl' => 'public, max-age=86400'],
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
