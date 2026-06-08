<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

    public static function url(?string $pathOrUrl): ?string
    {
        if (! filled($pathOrUrl)) {
            return null;
        }

        if (static::isAbsoluteUrl($pathOrUrl)) {
            return static::normalizePublicUrl($pathOrUrl);
        }

        $path = static::normalizePath($pathOrUrl);

        $url = static::disk() === 'gcs'
            ? static::gcsPublicUrl($path)
            : static::filesystem()->url($path);

        if ($url === '') {
            return null;
        }

        return static::normalizePublicUrl($url);
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
                throw new \RuntimeException('No se pudo guardar el archivo.');
            }

            return static::normalizePath($storedPath);
        }

        $storedPath = $file->store($directory, static::disk());

        if ($storedPath === false) {
            throw new \RuntimeException('No se pudo guardar el archivo.');
        }

        return static::normalizePath($storedPath);
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

        if (preg_match('#/storage/(.+)$#', $stored, $matches) === 1) {
            return static::normalizePath($matches[1]);
        }

        $prefixes = static::publicUrlPrefixes();
        usort($prefixes, fn (string $a, string $b): int => strlen($b) <=> strlen($a));

        foreach ($prefixes as $prefix) {
            if (str_starts_with($stored, $prefix)) {
                return ltrim(substr($stored, strlen($prefix)), '/');
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

        foreach (['public', static::disk()] as $diskName) {
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
        if (filled($custom)) {
            $base = rtrim(static::normalizePublicUrl((string) $custom), '/');
            $bucket = (string) config('filesystems.disks.gcs.bucket', '');
            if ($bucket !== '' && ! str_contains($base, '/'.$bucket)) {
                $base .= '/'.$bucket;
            }
            $prefixes[] = $base.'/';
        }

        return array_values(array_unique($prefixes));
    }

    public static function gcsPublicUrl(string $path): string
    {
        $bucket = (string) config('filesystems.disks.gcs.bucket');
        $prefix = trim((string) config('filesystems.disks.gcs.path_prefix', ''), '/');
        $objectPath = $prefix !== '' ? $prefix.'/'.$path : $path;
        $objectPath = ltrim(str_replace('\\', '/', $objectPath), '/');

        $customBase = config('filesystems.disks.gcs.url');
        if (filled($customBase)) {
            $base = rtrim(static::normalizePublicUrl((string) $customBase), '/');

            if ($bucket !== '' && (str_ends_with($base, '/'.$bucket) || str_contains($base, '/'.$bucket.'/'))) {
                return $base.'/'.ltrim($objectPath, '/');
            }

            if ($bucket !== '') {
                return $base.'/'.$bucket.'/'.ltrim($objectPath, '/');
            }

            return $base.'/'.ltrim($objectPath, '/');
        }

        return 'https://storage.googleapis.com/'.$bucket.'/'.ltrim($objectPath, '/');
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
