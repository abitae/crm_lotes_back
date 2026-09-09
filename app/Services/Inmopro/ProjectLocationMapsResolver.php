<?php

namespace App\Services\Inmopro;

use Illuminate\Support\Facades\Http;
use Throwable;

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

    /**
     * @var list<string>
     */
    private const SHORT_HOSTS = [
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

    public function isCoordinatePair(string $value): bool
    {
        return $this->parseCoordinatePair($value) !== null;
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    public function parseCoordinatePair(string $value): ?array
    {
        $value = trim($value);

        if (! preg_match('/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/', $value, $matches)) {
            return null;
        }

        return $this->validatedPair((float) $matches[1], (float) $matches[2]);
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    public function resolveCoordinates(?string $location): ?array
    {
        $location = is_string($location) ? trim($location) : '';

        if ($location === '') {
            return null;
        }

        $fromPair = $this->parseCoordinatePair($location);

        if ($fromPair !== null) {
            return $fromPair;
        }

        if (! $this->isGoogleMapsUrl($location)) {
            return null;
        }

        $fromUrl = $this->parseCoordinatesFromMapsUrl($location);

        if ($fromUrl !== null) {
            return $fromUrl;
        }

        if (! $this->isShortMapsUrl($location)) {
            return null;
        }

        $resolved = $this->followShortMapsUrl($location);

        return $resolved === null ? null : $this->parseCoordinatesFromMapsUrl($resolved);
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    public function parseCoordinatesFromMapsUrl(string $url): ?array
    {
        if (preg_match('/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/', $url, $matches)) {
            return $this->validatedPair((float) $matches[1], (float) $matches[2]);
        }

        if (preg_match('/\/(?:search|dir|place)\/(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/', $url, $matches)) {
            return $this->validatedPair((float) $matches[1], (float) $matches[2]);
        }

        $query = parse_url($url, PHP_URL_QUERY);

        if (! is_string($query) || $query === '') {
            return null;
        }

        parse_str($query, $params);

        foreach (['q', 'query', 'll', 'center'] as $key) {
            $value = $params[$key] ?? null;

            if (! is_string($value) || $value === '') {
                continue;
            }

            $coords = $this->parseCoordinatePair($value);

            if ($coords !== null) {
                return $coords;
            }

            if (preg_match('/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/', $value, $matches)) {
                return $this->validatedPair((float) $matches[1], (float) $matches[2]);
            }
        }

        return null;
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

    /**
     * URL de iframe para embeber Google Maps (sin seguir acortadores).
     */
    public function resolveEmbedUrl(?string $location): ?string
    {
        $location = is_string($location) ? trim($location) : '';

        if ($location === '') {
            return null;
        }

        $coords = $this->parseCoordinatePair($location);

        if ($coords === null && $this->isGoogleMapsUrl($location)) {
            $coords = $this->parseCoordinatesFromMapsUrl($location);
        }

        if ($coords !== null) {
            return sprintf(
                'https://maps.google.com/maps?q=%s,%s&z=16&output=embed&hl=es',
                $coords['lat'],
                $coords['lng'],
            );
        }

        if ($this->isGoogleMapsUrl($location)) {
            $query = parse_url($location, PHP_URL_QUERY);
            $params = [];

            if (is_string($query) && $query !== '') {
                parse_str($query, $params);
            }

            $search = $params['q'] ?? $params['query'] ?? null;

            if (is_string($search) && trim($search) !== '') {
                return 'https://maps.google.com/maps?q='.rawurlencode($search).'&z=16&output=embed&hl=es';
            }

            $separator = str_contains($location, '?') ? '&' : '?';

            return $location.$separator.'output=embed';
        }

        return 'https://maps.google.com/maps?q='.rawurlencode($location).'&z=16&output=embed&hl=es';
    }

    public function displayLabel(?string $location): ?string
    {
        $location = is_string($location) ? trim($location) : '';

        if ($location === '') {
            return null;
        }

        if ($this->isGoogleMapsUrl($location) || $this->isCoordinatePair($location)) {
            return 'Abrir en Google Maps';
        }

        return $location;
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    private function validatedPair(float $latitude, float $longitude): ?array
    {
        if ($latitude < -90.0 || $latitude > 90.0 || $longitude < -180.0 || $longitude > 180.0) {
            return null;
        }

        return [
            'lat' => $latitude,
            'lng' => $longitude,
        ];
    }

    private function isShortMapsUrl(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return in_array($host, self::SHORT_HOSTS, true);
    }

    private function followShortMapsUrl(string $url): ?string
    {
        $current = $url;

        for ($attempt = 0; $attempt < 5; $attempt++) {
            if (! $this->isGoogleMapsUrl($current)) {
                return null;
            }

            try {
                $response = Http::timeout(5)
                    ->withOptions(['allow_redirects' => false])
                    ->withHeaders(['User-Agent' => 'Inmopro/1.0'])
                    ->get($current);
            } catch (Throwable) {
                return null;
            }

            $location = $response->header('Location');

            if (! is_string($location) || trim($location) === '') {
                return $current;
            }

            $current = $this->absolutizeUrl(trim($location), $current);

            if ($this->parseCoordinatesFromMapsUrl($current) !== null) {
                return $current;
            }
        }

        return $current;
    }

    private function absolutizeUrl(string $location, string $current): string
    {
        if (filter_var($location, FILTER_VALIDATE_URL)) {
            return $location;
        }

        $parts = parse_url($current);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';

        if ($host === '') {
            return $location;
        }

        if (str_starts_with($location, '//')) {
            return $scheme.':'.$location;
        }

        if (str_starts_with($location, '/')) {
            return $scheme.'://'.$host.$location;
        }

        return $location;
    }
}
