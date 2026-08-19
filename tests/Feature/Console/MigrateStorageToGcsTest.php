<?php

namespace Tests\Feature\Console;

use App\Models\Inmopro\Project;
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

    public function test_migration_classifies_verifies_and_can_resume_files(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::fake('gcs');
        Storage::disk('public')->put('inmopro/lot-transfer-confirmations/evidence.jpg', 'content');
        config(['filesystems.disks.gcs.bucket' => 'test-bucket']);

        $this->artisan('storage:migrate-to-gcs')->assertSuccessful();
        Storage::disk('gcs')->assertExists('transfer-confirmations/evidence.jpg');
        Storage::disk('local')->assertExists('gcs-migration/manifest.json');

        $this->artisan('storage:migrate-to-gcs')->assertSuccessful();
        $this->assertSame('content', Storage::disk('gcs')->get('transfer-confirmations/evidence.jpg'));
    }

    public function test_delete_local_only_runs_after_integrity_verification(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::fake('gcs');
        Storage::disk('public')->put('projects/1/test.jpg', 'content');
        config(['filesystems.disks.gcs.bucket' => 'test-bucket']);

        $this->artisan('storage:migrate-to-gcs', ['--delete-local' => true])->assertSuccessful();

        Storage::disk('public')->assertMissing('projects/1/test.jpg');
        Storage::disk('gcs')->assertExists('projects/1/test.jpg');
    }

    public function test_migration_normalizes_legacy_gcs_urls_in_database(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::fake('gcs');
        Storage::disk('public')->put('projects/1/portada.jpg', 'content');
        config([
            'filesystems.disks.gcs.bucket' => 'test-bucket',
            'filesystems.disks.gcs.path_prefix' => 'lotes',
        ]);
        $project = Project::query()->create([
            'name' => 'Proyecto GCS',
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'image_portada' => 'https://storage.googleapis.com/test-bucket/lotes/projects/1/portada.jpg',
        ]);

        $this->artisan('storage:migrate-to-gcs')->assertSuccessful();

        $this->assertSame('projects/1/portada.jpg', $project->fresh()->image_portada);
    }

    public function test_fails_when_bucket_not_configured(): void
    {
        Storage::fake('gcs');
        config(['filesystems.disks.gcs.bucket' => null]);

        $this->artisan('storage:migrate-to-gcs')
            ->assertFailed();
    }
}
