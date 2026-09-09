<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Models\Inmopro\ProjectFlatPolygon;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CrmProjectsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_index_only_lists_active_projects(): void
    {
        $advisor = Advisor::firstOrFail();
        $activeCount = Project::query()->where('is_active', true)->count();
        Project::query()->where('is_active', true)->first()?->update(['is_active' => false]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.projects.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('projects', $activeCount - 1));
    }

    public function test_index_exposes_card_payload_with_maps_documents_and_share_urls(): void
    {
        Storage::fake('public');
        config()->set('services.google.maps_api_key', 'test-maps-key');

        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $project->update([
            'location' => '-12.046374,-77.042793',
            'tour_360_url' => route('public.project-360.projects.show', $project),
            'city_id' => null,
            'district' => null,
        ]);

        ProjectFlatPolygon::query()->create([
            'project_id' => $project->id,
            'lot_id' => null,
            'title' => 'Manzana A',
            'vertices' => [
                ['lat' => -12.0460, 'lng' => -77.0430],
                ['lat' => -12.0460, 'lng' => -77.0420],
                ['lat' => -12.0470, 'lng' => -77.0420],
                ['lat' => -12.0470, 'lng' => -77.0430],
            ],
            'color' => '#f97316',
            'hover_color' => '#fb923c',
            'opacity' => 0.35,
        ]);

        $storedPath = UploadedFile::fake()
            ->create('brochure.pdf', 120, 'application/pdf')
            ->store("projects/{$project->id}/documents", 'public');
        $asset = ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => 'document',
            'title' => 'Brochure',
            'file_name' => 'brochure.pdf',
            'file_path' => $storedPath,
            'mime_type' => 'application/pdf',
            'file_size' => 120 * 1024,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->actingAs($advisor, 'advisor')
            ->get(route('crm.projects.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('crm/projects/index')
                ->where('projects', function ($projects) use ($project, $asset) {
                    $row = collect($projects)->firstWhere('id', $project->id);

                    if (! is_array($row)) {
                        return false;
                    }

                    $document = $row['documents'][0] ?? null;

                    return $row['view_360_url'] === $project->tour_360_url
                        && $row['view_flat_url'] === route('crm.projects.flat', $project)
                        && $row['maps_url'] !== null
                        && is_string($row['maps_embed_url'])
                        && str_contains($row['maps_embed_url'], 'output=embed')
                        && str_contains($row['maps_embed_url'], '-12.046374')
                        && $row['documents_count'] === 1
                        && is_array($document)
                        && $document['id'] === $asset->id
                        && $document['download_url'] === route('crm.projects.assets.download', [$project, $asset])
                        && str_contains((string) $document['share_url'], 'signature=');
                }));
    }

    public function test_advisor_can_download_project_document(): void
    {
        Storage::fake('public');

        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $storedPath = UploadedFile::fake()
            ->create('brochure.pdf', 120, 'application/pdf')
            ->store("projects/{$project->id}/documents", 'public');
        $asset = ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => 'document',
            'title' => 'Brochure',
            'file_name' => 'brochure.pdf',
            'file_path' => $storedPath,
            'mime_type' => 'application/pdf',
            'file_size' => 120 * 1024,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->actingAs($advisor, 'advisor')
            ->get(route('crm.projects.assets.download', [$project, $asset]))
            ->assertOk();
    }

    public function test_guest_cannot_download_project_document(): void
    {
        Storage::fake('public');

        $project = Project::query()->where('is_active', true)->firstOrFail();
        $storedPath = UploadedFile::fake()
            ->create('brochure.pdf', 120, 'application/pdf')
            ->store("projects/{$project->id}/documents", 'public');
        $asset = ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => 'document',
            'title' => 'Brochure',
            'file_name' => 'brochure.pdf',
            'file_path' => $storedPath,
            'mime_type' => 'application/pdf',
            'file_size' => 120 * 1024,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->get(route('crm.projects.assets.download', [$project, $asset]))
            ->assertRedirect(route('crm.login'));
    }

    public function test_flat_view_requires_polygons_and_active_project(): void
    {
        config()->set('services.google.maps_api_key', 'test-maps-key');

        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $project->update(['location' => '-12.046374,-77.042793']);

        $this->actingAs($advisor, 'advisor')
            ->get(route('crm.projects.flat', $project))
            ->assertNotFound();

        ProjectFlatPolygon::query()->create([
            'project_id' => $project->id,
            'lot_id' => null,
            'title' => 'Manzana A',
            'vertices' => [
                ['lat' => -12.0460, 'lng' => -77.0430],
                ['lat' => -12.0460, 'lng' => -77.0420],
                ['lat' => -12.0470, 'lng' => -77.0420],
                ['lat' => -12.0470, 'lng' => -77.0430],
            ],
            'color' => '#f97316',
            'hover_color' => '#fb923c',
            'opacity' => 0.35,
        ]);

        $this->actingAs($advisor, 'advisor')
            ->get(route('crm.projects.flat', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('crm/projects/flat')
                ->where('project.id', $project->id)
                ->has('polygons', 1)
                ->where('googleMapsApiKey', 'test-maps-key'));

        $project->update(['is_active' => false]);

        $this->actingAs($advisor, 'advisor')
            ->get(route('crm.projects.flat', $project))
            ->assertNotFound();
    }

    public function test_show_lists_lots_for_the_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $libreId = LotStatus::where('code', 'LIBRE')->value('id');

        Lot::create([
            'project_id' => $project->id, 'block' => 'Z', 'number' => '1',
            'area' => 100, 'price' => 30000, 'lot_status_id' => $libreId,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.projects.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('project.id', $project->id));
    }

    public function test_show_returns_404_for_inactive_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->where('is_active', true)->firstOrFail();
        $project->update(['is_active' => false]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.projects.show', $project))->assertNotFound();
    }
}
