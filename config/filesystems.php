<?php

use League\Flysystem\GoogleCloudStorage\UniformBucketLevelAccessVisibility;

$defaultDisk = env('FILESYSTEM_DISK', env('APP_ENV') === 'production' ? 'gcs' : 'public');
$gcsPrivateKey = env('GOOGLE_CLOUD_PRIVATE_KEY');
$gcsClientEmail = env('GOOGLE_CLOUD_CLIENT_EMAIL');
$gcsKeyFile = filled($gcsPrivateKey) && filled($gcsClientEmail) ? [
    'type' => env('GOOGLE_CLOUD_ACCOUNT_TYPE', 'service_account'),
    'private_key_id' => env('GOOGLE_CLOUD_PRIVATE_KEY_ID'),
    'private_key' => str_replace('\\n', "\n", (string) $gcsPrivateKey),
    'client_email' => $gcsClientEmail,
    'client_id' => env('GOOGLE_CLOUD_CLIENT_ID'),
    'auth_uri' => env('GOOGLE_CLOUD_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
    'token_uri' => env('GOOGLE_CLOUD_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
    'auth_provider_x509_cert_url' => env('GOOGLE_CLOUD_AUTH_PROVIDER_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
    'client_x509_cert_url' => env('GOOGLE_CLOUD_CLIENT_CERT_URL'),
] : null;

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

    'default' => $defaultDisk,

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
            'key_file_path' => env('GOOGLE_CLOUD_KEY_FILE_PATH'),
            'key_file' => $gcsKeyFile,
            'project_id' => env('GOOGLE_CLOUD_PROJECT_ID'),
            'bucket' => env('GOOGLE_CLOUD_STORAGE_BUCKET'),
            'path_prefix' => env('GOOGLE_CLOUD_STORAGE_PATH_PREFIX', 'lotes'),
            'url' => env('GOOGLE_CLOUD_STORAGE_URL'),
            'storage_api_uri' => env('GOOGLE_CLOUD_STORAGE_API_URI'),
            'api_endpoint' => env('GOOGLE_CLOUD_STORAGE_API_ENDPOINT', 'https://storage.googleapis.com'),
            'visibility' => 'noPredefinedVisibility',
            'visibility_handler' => UniformBucketLevelAccessVisibility::class,
            'metadata' => ['cacheControl' => 'private, max-age=3600'],
            'throw' => true,
            'report' => true,
        ],

    ],

    'temporary_urls' => [
        'catalog_ttl_minutes' => (int) env('GCS_CATALOG_URL_TTL_MINUTES', 60),
        'sensitive_ttl_minutes' => (int) env('GCS_SENSITIVE_URL_TTL_MINUTES', 10),
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
