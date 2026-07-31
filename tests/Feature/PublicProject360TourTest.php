<?php

namespace Tests\Feature;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Models\User;
use App\Services\Inmopro\Project360ShareService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicProject360TourTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        config()->set('cazador.default_storage_disk', 'public');
    }

    public function test_signed_public_tour_and_panorama_are_available_without_authentication(): void
    {
        [$project, $tour, $panorama] = $this->createTour();
        $shareLink = $this->createShareLink($tour);
        $service = app(Project360ShareService::class);

        $this->get($service->tourUrl($shareLink))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/project-360/show')
                ->where('project.name', $project->name)
                ->has('tour.panoramas', 1));

        $this->get($service->panoramaUrl($shareLink, $panorama))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');

        $this->assertNotNull($shareLink->fresh()->last_accessed_at);
    }

    public function test_tampered_or_revoked_share_links_are_rejected(): void
    {
        [, $tour, $panorama] = $this->createTour();
        $shareLink = $this->createShareLink($tour);
        $service = app(Project360ShareService::class);
        $tourUrl = $service->tourUrl($shareLink);
        $tamperedUrl = preg_replace('/signature=[^&]+/', 'signature=invalid', $tourUrl) ?? $tourUrl;

        $this->get($tamperedUrl)->assertForbidden();

        $shareLink->update(['revoked_at' => now()]);

        $this->get($tourUrl)->assertNotFound();
        $this->get($service->panoramaUrl($shareLink, $panorama))->assertNotFound();
    }

    public function test_inactive_projects_and_foreign_panoramas_are_rejected(): void
    {
        [$project, $tour] = $this->createTour();
        $shareLink = $this->createShareLink($tour);
        $service = app(Project360ShareService::class);
        $foreignProject = $this->createProject('Otro proyecto');
        $foreignPanorama = $this->createPanorama($foreignProject);

        $this->get($service->panoramaUrl($shareLink, $foreignPanorama))
            ->assertNotFound();

        $project->update(['is_active' => false]);

        $this->get($service->tourUrl($shareLink))->assertNotFound();
    }

    /** @return array{0: Project, 1: Project360Tour, 2: ProjectAsset} */
    private function createTour(): array
    {
        $project = $this->createProject('Proyecto público');
        $panorama = $this->createPanorama($project);
        $tour = Project360Tour::query()->create([
            'project_id' => $project->id,
            'start_panorama_id' => $panorama->id,
        ]);

        return [$project, $tour, $panorama];
    }

    private function createProject(string $name): Project
    {
        return Project::query()->create([
            'name' => $name,
            'location' => 'Lima',
            'total_lots' => 1,
            'blocks' => ['A'],
            'is_active' => true,
        ]);
    }

    private function createPanorama(Project $project): ProjectAsset
    {
        $fileName = "panorama_{$project->id}.jpg";
        $path = UploadedFile::fake()
            ->create($fileName, 1, 'image/jpeg')
            ->storeAs("projects/{$project->id}/panoramas", $fileName, 'public');

        return ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => ProjectAsset::KIND_PANORAMA,
            'title' => 'Vista principal',
            'file_name' => $fileName,
            'file_path' => $path,
            'mime_type' => 'image/jpeg',
            'file_size' => 1000,
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }

    private function createShareLink(Project360Tour $tour): Project360ShareLink
    {
        return Project360ShareLink::query()->create([
            'project_360_tour_id' => $tour->id,
            'created_by' => User::factory()->create()->id,
            'label' => 'Cliente demo',
        ]);
    }
}
