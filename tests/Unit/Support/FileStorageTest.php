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
}
