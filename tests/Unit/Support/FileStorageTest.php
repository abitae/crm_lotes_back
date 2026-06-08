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

    public function test_gcs_public_url_includes_bucket_and_path_prefix(): void
    {
        config([
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.disks.gcs.bucket' => 'storage_abitae',
            'filesystems.disks.gcs.path_prefix' => 'lotes',
            'filesystems.disks.gcs.url' => null,
        ]);

        $this->assertSame(
            'https://storage.googleapis.com/storage_abitae/lotes/branding/logo.png',
            FileStorage::url('branding/logo.png'),
        );
    }

    public function test_gcs_public_url_adds_bucket_when_custom_base_is_api_host(): void
    {
        config([
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.disks.gcs.bucket' => 'storage_abitae',
            'filesystems.disks.gcs.path_prefix' => 'lotes',
            'filesystems.disks.gcs.url' => 'https://storage.googleapis.com',
        ]);

        $this->assertSame(
            'https://storage.googleapis.com/storage_abitae/lotes/branding/favicon.png',
            FileStorage::url('branding/favicon.png'),
        );
    }

    public function test_url_normalizes_windows_path_separators(): void
    {
        config([
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.disks.gcs.bucket' => 'storage_abitae',
            'filesystems.disks.gcs.path_prefix' => 'lotes',
            'filesystems.disks.gcs.url' => null,
        ]);

        $this->assertSame(
            'https://storage.googleapis.com/storage_abitae/lotes/branding/logo.png',
            FileStorage::url('branding\\logo.png'),
        );
    }
}
