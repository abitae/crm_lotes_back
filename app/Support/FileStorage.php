<?php

namespace App\Support;

use DateTimeInterface;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class FileStorage
{
    public static function disk(): string
    {
        return (string) config('cazador.default_storage_disk', config('filesystems.default', 'public'));
    }

    public static function filesystem(): Filesystem
    {
        return Storage::disk(static::disk());
    }

    public static function url(?string $pathOrUrl, ?DateTimeInterface $expiration = null): ?string
    {
        if (! filled($pathOrUrl)) {
            return null;
        }

        if (static::isAbsoluteUrl($pathOrUrl)) {
            if (static::disk() !== 'gcs') {
                return static::normalizePublicUrl($pathOrUrl);
            }

            $relative = static::pathFromStored($pathOrUrl);
            if ($relative === null) {
                return static::normalizePublicUrl($pathOrUrl);
            }

            $pathOrUrl = $relative;
        }

        $path = static::normalizePath($pathOrUrl);

        $url = static::disk() === 'gcs'
            ? static::filesystem()->temporaryUrl(
                $path,
                $expiration ?? now()->addMinutes((int) config('filesystems.temporary_urls.catalog_ttl_minutes', 60)),
            )
            : static::filesystem()->url($path);

        if ($url === '') {
            return null;
        }

        return static::normalizePublicUrl($url);
    }

    public static function sensitiveUrl(?string $pathOrUrl): ?string
    {
        return static::url(
            $pathOrUrl,
            now()->addMinutes((int) config('filesystems.temporary_urls.sensitive_ttl_minutes', 10)),
        );
    }

    public static function exists(?string $pathOrUrl): bool
    {
        $path = static::pathFromStored($pathOrUrl);

        return $path !== null && static::filesystem()->exists($path);
    }

    public static function deleteIfExists(?string $pathOrUrl): void
    {
        $path = static::pathFromStored($pathOrUrl);

        if ($path !== null && static::filesystem()->exists($path)) {
            static::filesystem()->delete($path);
        }
    }

    public static function storeUploadedFile(
        UploadedFile $file,
        string $directory,
        ?string $fileName = null,
    ): string {
        $directory = trim(str_replace('\\', '/', $directory), '/');

        if ($fileName !== null) {
            $storedPath = $file->storeAs($directory, $fileName, static::disk());

            if ($storedPath === false) {
                throw new RuntimeException('No se pudo guardar el archivo.');
            }

            return static::normalizePath($storedPath);
        }

        $storedPath = $file->store($directory, static::disk());

        if ($storedPath === false) {
            throw new RuntimeException('No se pudo guardar el archivo.');
        }

        return static::normalizePath($storedPath);
    }

    public static function storeContent(string $path, string $contents): string
    {
        $path = static::normalizePath($path);

        if (! static::filesystem()->put($path, $contents)) {
            throw new RuntimeException('No se pudo guardar el archivo.');
        }

        return $path;
    }

    public static function copy(string $source, string $destination): string
    {
        $source = static::normalizePath($source);
        $destination = static::normalizePath($destination);

        if (! static::filesystem()->copy($source, $destination)) {
            throw new RuntimeException('No se pudo copiar el archivo.');
        }

        return $destination;
    }

    /**
     * Resuelve path relativo desde valor guardado (path o URL legacy).
     */
    public static function pathFromStored(?string $stored): ?string
    {
        if (! filled($stored)) {
            return null;
        }

        if (! static::isAbsoluteUrl($stored)) {
            return static::normalizePath($stored);
        }

        $storedWithoutQuery = preg_split('/[?#]/', $stored, 2)[0] ?? $stored;

        if (preg_match('#/storage/(.+)$#', $storedWithoutQuery, $matches) === 1) {
            return static::normalizePath($matches[1]);
        }

        $prefixes = static::publicUrlPrefixes();
        usort($prefixes, fn (string $a, string $b): int => strlen($b) <=> strlen($a));

        foreach ($prefixes as $prefix) {
            if (str_starts_with($storedWithoutQuery, $prefix)) {
                return ltrim(substr($storedWithoutQuery, strlen($prefix)), '/');
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public static function publicUrlPrefixes(): array
    {
        $prefixes = [];

        foreach (['public'] as $diskName) {
            try {
                $url = Storage::disk($diskName)->url('');
                if ($url !== '') {
                    $prefixes[] = rtrim($url, '/').'/';
                }
            } catch (\Throwable) {
                continue;
            }
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '') {
            $prefixes[] = $appUrl.'/storage/';
        }

        $custom = config('filesystems.disks.gcs.url');
        $bucket = trim((string) config('filesystems.disks.gcs.bucket'), '/');
        $pathPrefix = trim((string) config('filesystems.disks.gcs.path_prefix'), '/');
        $gcsSuffix = implode('/', array_filter([$bucket, $pathPrefix])).'/';

        if ($bucket !== '') {
            $prefixes[] = 'https://storage.googleapis.com/'.$gcsSuffix;
        }

        if (filled($custom)) {
            $base = rtrim(static::normalizePublicUrl((string) $custom), '/');
            if ($bucket !== '' && ! str_contains($base, '/'.$bucket)) {
                $base .= '/'.$bucket;
            }
            if ($pathPrefix !== '' && ! str_ends_with($base, '/'.$pathPrefix)) {
                $base .= '/'.$pathPrefix;
            }
            $prefixes[] = $base.'/';
        }

        return array_values(array_unique($prefixes));
    }

    public static function normalizePublicUrl(string $url): string
    {
        return str_replace('\\', '/', $url);
    }

    public static function isAbsoluteUrl(string $value): bool
    {
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }

    public static function normalizePath(string $path): string
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path;
    }
}
