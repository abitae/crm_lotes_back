<?php

namespace Tests\Unit\Inmopro;

use App\Models\Inmopro\Project;
use App\Services\Inmopro\ProjectAssetStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectAssetStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_stored_file_name_uses_project_id_and_four_digits(): void
    {
        $service = app(ProjectAssetStorageService::class);

        $name = $service->generateStoredFileName(12, 'image', 'jpg');

        $this->assertMatchesRegularExpression('/^image_12_\d{4}\.jpg$/', $name);
    }

    public function test_generate_stored_file_name_uses_document_prefix_for_documents(): void
    {
        $service = app(ProjectAssetStorageService::class);

        $name = $service->generateStoredFileName(3, 'document', 'pdf');

        $this->assertMatchesRegularExpression('/^document_3_\d{4}\.pdf$/', $name);
    }

    public function test_generate_stored_file_name_uses_video_prefix_for_videos(): void
    {
        $service = app(ProjectAssetStorageService::class);

        $name = $service->generateStoredFileName(5, 'video', 'mp4');

        $this->assertMatchesRegularExpression('/^video_5_\d{4}\.mp4$/', $name);
    }

    public function test_store_saves_image_with_generated_file_name(): void
    {
        Storage::fake('public');

        $project = Project::query()->create([
            'name' => 'Proyecto test',
            'location' => 'Lima',
            'total_lots' => 10,
            'blocks' => ['A'],
            'is_active' => true,
        ]);
        $service = app(ProjectAssetStorageService::class);
        $file = UploadedFile::fake()->image('fachada original.png');

        $stored = $service->store($project, $file, 'image');

        $this->assertMatchesRegularExpression('/^image_'.$project->id.'_\d{4}\.png$/', $stored['file_name']);
        $this->assertSame('projects/'.$project->id.'/images/'.$stored['file_name'], $stored['file_path']);
        Storage::disk('public')->assertExists($stored['file_path']);
    }

    public function test_store_saves_document_with_generated_file_name(): void
    {
        Storage::fake('public');

        $project = Project::query()->create([
            'name' => 'Proyecto test',
            'location' => 'Lima',
            'total_lots' => 10,
            'blocks' => ['A'],
            'is_active' => true,
        ]);
        $service = app(ProjectAssetStorageService::class);
        $file = UploadedFile::fake()->create('contrato original.pdf', 100, 'application/pdf');

        $stored = $service->store($project, $file, 'document');

        $this->assertMatchesRegularExpression('/^document_'.$project->id.'_\d{4}\.pdf$/', $stored['file_name']);
        Storage::disk('public')->assertExists($stored['file_path']);
    }
}
