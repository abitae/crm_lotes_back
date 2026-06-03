<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MigrateStorageToGcsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_lists_files_without_copying(): void
    {
        Storage::fake('public');
        Storage::fake('gcs');
        Storage::disk('public')->put('projects/1/test.jpg', 'content');

        config([
            'filesystems.disks.gcs.bucket' => 'test-bucket',
        ]);

        $this->artisan('storage:migrate-to-gcs', ['--dry-run' => true])
            ->assertSuccessful();

        Storage::disk('gcs')->assertMissing('projects/1/test.jpg');
    }

    public function test_fails_when_bucket_not_configured(): void
    {
        Storage::fake('gcs');
        config(['filesystems.disks.gcs.bucket' => null]);

        $this->artisan('storage:migrate-to-gcs')
            ->assertFailed();
    }
}
