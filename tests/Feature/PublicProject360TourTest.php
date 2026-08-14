<?php

namespace Tests\Feature;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Models\User;
use App\Services\Inmopro\Project360ShareService;
use App\Services\Inmopro\Project360TourService;
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
        $status = LotStatus::query()->create([
            'name' => 'Libre',
            'code' => LotStatus::CODE_LIBRE,
            'color' => '#10b981',
            'sort_order' => 1,
        ]);
        $lot = Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => 12,
            'area' => 120,
            'price' => 50000,
            'lot_status_id' => $status->id,
            'client_name' => 'No debe publicarse',
        ]);
        $tour->polygons()->create([
            'source_panorama_id' => $panorama->id,
            'lot_id' => $lot->id,
            'title' => 'Lote 12',
            'description' => 'Zona informativa',
            'vertices' => [
                ['yaw' => 0, 'pitch' => 0],
                ['yaw' => 10, 'pitch' => 0],
                ['yaw' => 5, 'pitch' => 10],
            ],
            'color' => '#f97316',
            'hover_color' => '#fb923c',
            'opacity' => 0.28,
        ]);
        $shareLink = $this->createShareLink($tour);
        $service = app(Project360ShareService::class);

        $this->get($service->tourUrl($shareLink))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/project-360/show')
                ->where('project.name', $project->name)
                ->has('tour.panoramas', 1)
                ->has('tour.polygons', 1)
                ->where('tour.polygons.0.title', 'Lote 12')
                ->where('tour.polygons.0.color', '#10b981')
                ->where('tour.polygons.0.lot.number', '12')
                ->where('tour.polygons.0.lot.status.name', 'Libre')
                ->missing('tour.polygons.0.lot.client_name')
                ->missing('tour.floor_plans'));

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

    public function test_public_project_html_and_json_are_available_without_authentication(): void
    {
        [$project, , $panorama] = $this->createTour();
        app(Project360TourService::class)->syncTour360Url($project);
        $project->refresh();

        $this->assertSame(
            route('public.project-360.projects.show', $project),
            $project->tour_360_url,
        );

        $this->get(route('public.project-360.projects.show', $project))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/project-360/show')
                ->where('project.name', $project->name)
                ->where('embedded', false)
                ->has('tour.panoramas', 1));

        $this->get(route('public.project-360.projects.show', ['project' => $project, 'embed' => 1]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('embedded', true));

        $this->get(route('public.project-360.projects.panoramas.show', [$project, $panorama]))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');

        $this->getJson(route('api.v1.web.projects.tour-360.show', $project))
            ->assertOk()
            ->assertJsonPath('project.id', $project->id)
            ->assertJsonPath('project.name', $project->name)
            ->assertJsonPath('tour.panoramas.0.id', $panorama->id)
            ->assertJsonPath(
                'tour.panoramas.0.viewer_url',
                route('api.v1.web.projects.tour-360.panoramas.show', [$project, $panorama]),
            );

        $this->get(route('api.v1.web.projects.tour-360.panoramas.show', [$project, $panorama]))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_public_project_tour_rejects_inactive_projects_and_empty_tours(): void
    {
        $empty = $this->createProject('Sin panoramas');
        $this->get(route('public.project-360.projects.show', $empty))->assertNotFound();
        $this->getJson(route('api.v1.web.projects.tour-360.show', $empty))->assertNotFound();

        [$project, , $panorama] = $this->createTour();
        $foreign = $this->createPanorama($this->createProject('Ajeno'));

        $this->get(route('public.project-360.projects.panoramas.show', [$project, $foreign]))
            ->assertNotFound();

        $project->update(['is_active' => false]);
        $this->get(route('public.project-360.projects.show', $project))->assertNotFound();
        $this->getJson(route('api.v1.web.projects.tour-360.show', $project))->assertNotFound();
        $this->get(route('public.project-360.projects.panoramas.show', [$project, $panorama]))
            ->assertNotFound();
    }

    public function test_tour_360_url_clears_when_last_panorama_is_removed(): void
    {
        [$project, , $panorama] = $this->createTour();
        $service = app(Project360TourService::class);
        $service->syncTour360Url($project);
        $this->assertNotNull($project->fresh()->tour_360_url);

        $service->deletePanorama($project, $panorama);

        $this->assertNull($project->fresh()->tour_360_url);
        $this->get(route('public.project-360.projects.show', $project))->assertNotFound();
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
