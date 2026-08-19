<?php

namespace Tests\Unit\Support;

use App\Support\FileStorage;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileStorageTest extends TestCase
{
    public function test_path_from_stored_returns_relative_path(): void
    {
        $this->assertSame('projects/1/portada.jpg', FileStorage::pathFromStored('projects/1/portada.jpg'));
    }

    public function test_path_from_stored_extracts_path_from_public_url(): void
    {
        Storage::fake('public');
        config(['filesystems.default' => 'public', 'cazador.default_storage_disk' => 'public']);

        $prefix = rtrim(Storage::disk('public')->url(''), '/').'/';
        $url = $prefix.'projects/2/portada.png';

        $this->assertSame('projects/2/portada.png', FileStorage::pathFromStored($url));
    }

    public function test_url_returns_absolute_urls_unchanged(): void
    {
        $url = 'https://storage.googleapis.com/bucket/file.jpg';

        $this->assertSame($url, FileStorage::url($url));
    }

    public function test_path_from_stored_extracts_relative_path_from_signed_gcs_url(): void
    {
        config([
            'filesystems.disks.gcs.bucket' => 'bucket-test',
            'filesystems.disks.gcs.path_prefix' => 'lotes',
        ]);

        $this->assertSame(
            'projects/1/portada.jpg',
            FileStorage::pathFromStored('https://storage.googleapis.com/bucket-test/lotes/projects/1/portada.jpg?X-Goog-Signature=abc'),
        );
    }

    public function test_gcs_url_is_temporary_and_normalizes_path(): void
    {
        Storage::fake('gcs');
        config([
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.temporary_urls.catalog_ttl_minutes' => 60,
        ]);
        Storage::disk('gcs')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): string => 'https://signed.test/'.$path.'?expires='.$expiration->getTimestamp(),
        );

        $url = FileStorage::url('branding\\logo.png');
        parse_str((string) parse_url((string) $url, PHP_URL_QUERY), $query);

        $this->assertStringStartsWith('https://signed.test/branding/logo.png?expires=', (string) $url);
        $this->assertEqualsWithDelta(now()->addMinutes(60)->timestamp, (int) $query['expires'], 5);
    }

    public function test_sensitive_gcs_url_uses_shorter_ttl(): void
    {
        Storage::fake('gcs');
        config([
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.temporary_urls.sensitive_ttl_minutes' => 10,
        ]);
        Storage::disk('gcs')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): string => 'https://signed.test/'.$path.'?'.$expiration->getTimestamp(),
        );

        $url = FileStorage::sensitiveUrl('pre-reservations/voucher.png');
        $expires = (int) substr((string) $url, strrpos((string) $url, '?') + 1);

        $this->assertEqualsWithDelta(now()->addMinutes(10)->timestamp, $expires, 5);
    }
}
