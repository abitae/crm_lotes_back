<?php

namespace App\Support;

use App\Models\AppBranding;
use Illuminate\Support\Facades\Cache;

class AppBrandingResolver
{
    private const string CACHE_KEY = 'app_branding.snapshot';

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
        return Cache::rememberForever(self::CACHE_KEY, function (): array {
            $row = AppBranding::query()->first();

            $displayName = filled($row?->display_name)
                ? (string) $row->display_name
                : (string) config('app.name');

            $logoUrl = null;
            if (filled($row?->logo_path)) {
                $logoUrl = FileStorage::url((string) $row->logo_path);
            }

            $tagline = filled($row?->tagline) ? (string) $row->tagline : null;

            $primaryColor = null;
            if (is_string($row?->primary_color) && preg_match('/^#[0-9A-Fa-f]{6}$/', $row->primary_color)) {
                $primaryColor = $row->primary_color;
            }

            $faviconUrl = null;
            if (filled($row?->favicon_path)) {
                $faviconUrl = FileStorage::url((string) $row->favicon_path);
            }

            return [
                'display_name' => $displayName,
                'logo_url' => $logoUrl,
                'tagline' => $tagline,
                'primary_color' => $primaryColor,
                'favicon_url' => $faviconUrl,
            ];
        });
    }

    public static function resolvedDisplayName(): string
    {
        return self::snapshot()['display_name'];
    }

    public static function logoUrl(): ?string
    {
        return self::snapshot()['logo_url'];
    }

    public static function tagline(): ?string
    {
        return self::snapshot()['tagline'];
    }

    public static function primaryColorHex(): string
    {
        return self::snapshot()['primary_color'] ?? self::DEFAULT_PRIMARY_HEX;
    }

    public static function faviconUrl(): ?string
    {
        return self::snapshot()['favicon_url'];
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
