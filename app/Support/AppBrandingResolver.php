<?php

namespace App\Support;

use App\Models\AppBranding;
use Illuminate\Support\Facades\Cache;

class AppBrandingResolver
{
    private const string CACHE_KEY = 'app_branding.snapshot.v2';

    private const string DEFAULT_PRIMARY_HEX = '#059669';

    /**
     * @return array{
     *     display_name: string,
     *     logo_url: ?string,
     *     tagline: ?string,
     *     primary_color: ?string,
     *     favicon_url: ?string
     * }
     */
    public static function snapshot(): array
    {
        $cached = self::cachedRow();

        return [
            'display_name' => $cached['display_name'],
            'logo_url' => self::publicUrl($cached['logo_path']),
            'tagline' => $cached['tagline'],
            'primary_color' => $cached['primary_color'],
            'favicon_url' => self::publicUrl($cached['favicon_path']),
        ];
    }

    public static function resolvedDisplayName(): string
    {
        return self::cachedRow()['display_name'];
    }

    public static function logoUrl(): ?string
    {
        return self::publicUrl(self::cachedRow()['logo_path']);
    }

    public static function tagline(): ?string
    {
        return self::cachedRow()['tagline'];
    }

    public static function primaryColorHex(): string
    {
        return self::cachedRow()['primary_color'] ?? self::DEFAULT_PRIMARY_HEX;
    }

    public static function faviconUrl(): ?string
    {
        return self::publicUrl(self::cachedRow()['favicon_path']);
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget('app_branding.snapshot');
    }

    /**
     * @return array{
     *     display_name: string,
     *     logo_path: ?string,
     *     tagline: ?string,
     *     primary_color: ?string,
     *     favicon_path: ?string
     * }
     */
    private static function cachedRow(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function (): array {
            $row = AppBranding::query()->first();

            $displayName = filled($row?->display_name)
                ? (string) $row->display_name
                : (string) config('app.name');

            $primaryColor = null;
            if (is_string($row?->primary_color) && preg_match('/^#[0-9A-Fa-f]{6}$/', $row->primary_color)) {
                $primaryColor = $row->primary_color;
            }

            return [
                'display_name' => $displayName,
                'logo_path' => filled($row?->logo_path) ? (string) $row->logo_path : null,
                'tagline' => filled($row?->tagline) ? (string) $row->tagline : null,
                'primary_color' => $primaryColor,
                'favicon_path' => filled($row?->favicon_path) ? (string) $row->favicon_path : null,
            ];
        });
    }

    private static function publicUrl(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        try {
            $url = FileStorage::url($path);

            return filled($url) ? $url : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
