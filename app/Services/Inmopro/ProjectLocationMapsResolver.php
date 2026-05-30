<?php

namespace App\Services\Inmopro;

class ProjectLocationMapsResolver
{
    /**
     * @var list<string>
     */
    private const ALLOWED_HOSTS = [
        'maps.google.com',
        'www.google.com',
        'google.com',
        'maps.app.goo.gl',
        'goo.gl',
    ];

    public function isGoogleMapsUrl(string $value): bool
    {
        $value = trim($value);

        if ($value === '' || ! filter_var($value, FILTER_VALIDATE_URL)) {
            return false;
        }

        $host = strtolower((string) parse_url($value, PHP_URL_HOST));

        if ($host === '') {
            return false;
        }

        if (! in_array($host, self::ALLOWED_HOSTS, true)) {
            return false;
        }

        if (in_array($host, ['www.google.com', 'google.com'], true)) {
            $path = strtolower((string) parse_url($value, PHP_URL_PATH));

            return str_contains($path, '/maps');
        }

        if ($host === 'goo.gl') {
            $path = strtolower((string) parse_url($value, PHP_URL_PATH));

            return str_starts_with($path, '/maps');
        }

        return true;
    }

    public function resolveMapsUrl(?string $location): ?string
    {
        $location = is_string($location) ? trim($location) : '';

        if ($location === '') {
            return null;
        }

        if ($this->isGoogleMapsUrl($location)) {
            return $location;
        }

        return 'https://www.google.com/maps/search/?api=1&query='.rawurlencode($location);
    }

    public function displayLabel(?string $location): ?string
    {
        $location = is_string($location) ? trim($location) : '';

        if ($location === '') {
            return null;
        }

        if ($this->isGoogleMapsUrl($location)) {
            return 'Ver en Google Maps';
        }

        return $location;
    }
}
