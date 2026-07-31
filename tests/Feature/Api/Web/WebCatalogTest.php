<?php

namespace Tests\Feature\Api\Web;

use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Models\Inmopro\ProjectType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WebCatalogTest extends TestCase
{
    use RefreshDatabase;

    private const DEFAULT_TIPO_WEB = 'lotesenremate.pe';

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function indexQuery(array $extra = []): array
    {
        return array_merge(['tipo_web' => self::DEFAULT_TIPO_WEB], $extra);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_projects_catalog_is_public_and_returns_summary_and_data(): void
    {
        $response = $this->getJson(route('api.v1.web.projects.index', $this->indexQuery()));

        $response->assertOk()
            ->assertJsonPath('meta.tipo_web', self::DEFAULT_TIPO_WEB)
            ->assertJsonStructure([
                'summary' => [
                    'projects_count',
                    'lots_total',
                    'lots_free',
                    'images_total',
                    'videos_total',
                ],
                'meta' => [
                    'tipo_web',
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                    'from',
                    'to',
                ],
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'location',
                        'maps_url',
                        'location_label',
                        'blocks',
                        'total_lots',
                        'lots_count',
                        'free_lots_count',
                        'project_type',
                        'image_portada',
                        'tipo_web',
                        'city',
                        'province',
                        'district',
                        'project_zone',
                        'registry_status',
                        'descripcion',
                        'precio_web',
                        'images',
                        'videos',
                        'images_count',
                        'videos_count',
                    ],
                ],
            ]);

        $this->assertSame(
            Project::query()->visibleOnWeb()->where('tipo_web', self::DEFAULT_TIPO_WEB)->count(),
            $response->json('meta.total')
        );
    }

    public function test_tour_assets_are_not_counted_as_regular_catalog_images(): void
    {
        $project = Project::query()
            ->visibleOnWeb()
            ->where('tipo_web', self::DEFAULT_TIPO_WEB)
            ->firstOrFail();
        $panorama = ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => ProjectAsset::KIND_PANORAMA,
            'title' => 'Vista 360',
            'file_name' => 'vista.jpg',
            'file_path' => "projects/{$project->id}/panoramas/vista.jpg",
            'mime_type' => 'image/jpeg',
            'file_size' => 1000,
            'sort_order' => 1,
            'is_active' => true,
        ]);
        $floorPlan = ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => ProjectAsset::KIND_FLOOR_PLAN,
            'title' => 'Plano 360',
            'file_name' => 'plano.jpg',
            'file_path' => "projects/{$project->id}/floor-plans/plano.jpg",
            'mime_type' => 'image/jpeg',
            'file_size' => 1000,
            'sort_order' => 2,
            'is_active' => true,
        ]);

        $response = $this->getJson(route('api.v1.web.projects.show', $project))
            ->assertOk();

        $this->assertNotContains($panorama->id, collect($response->json('data.images'))->pluck('id')->all());
        $this->assertNotContains($floorPlan->id, collect($response->json('data.images'))->pluck('id')->all());
        $this->get(route('api.v1.web.projects.assets.show', [$project, $panorama]))
            ->assertNotFound();
        $this->get(route('api.v1.web.projects.assets.show', [$project, $floorPlan]))
            ->assertNotFound();
    }

    public function test_projects_catalog_supports_pagination(): void
    {
        $response = $this->getJson(route('api.v1.web.projects.index', $this->indexQuery([
            'page' => 1,
            'per_page' => 2,
        ])));

        $response->assertOk()
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', Project::query()->visibleOnWeb()->where('tipo_web', self::DEFAULT_TIPO_WEB)->count())
            ->assertJsonCount(2, 'data');
    }

    public function test_projects_catalog_requires_tipo_web(): void
    {
        $this->getJson(route('api.v1.web.projects.index'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tipo_web']);
    }

    public function test_projects_catalog_filters_by_search(): void
    {
        $project = Project::query()->where('name', 'Mirador 3.1')->firstOrFail();

        $this->getJson(route('api.v1.web.projects.index', $this->indexQuery(['search' => 'Mirador'])))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $project->id);
    }

    public function test_projects_catalog_filters_by_project_type(): void
    {
        $type = ProjectType::query()->where('code', 'RESIDENCIAL')->firstOrFail();
        $expectedCount = Project::query()
            ->visibleOnWeb()
            ->where('tipo_web', self::DEFAULT_TIPO_WEB)
            ->where('project_type_id', $type->id)
            ->count();

        $this->getJson(route('api.v1.web.projects.index', $this->indexQuery(['project_type_id' => $type->id])))
            ->assertOk()
            ->assertJsonPath('meta.total', $expectedCount);
    }

    public function test_projects_catalog_filters_projects_with_free_lots(): void
    {
        $expectedCount = Project::query()
            ->visibleOnWeb()
            ->where('tipo_web', self::DEFAULT_TIPO_WEB)
            ->whereHas('lots', fn ($q) => $q->whereHas(
                'status',
                fn ($s) => $s->where('code', LotStatus::CODE_LIBRE)
            ))
            ->count();

        $this->getJson(route('api.v1.web.projects.index', $this->indexQuery(['has_free_lots' => 1])))
            ->assertOk()
            ->assertJsonPath('meta.total', $expectedCount);
    }

    public function test_projects_catalog_rejects_invalid_filters(): void
    {
        $this->getJson(route('api.v1.web.projects.index', $this->indexQuery([
            'per_page' => 100,
            'order' => 'invalid',
        ])))
            ->assertUnprocessable();
    }

    public function test_show_project_returns_payload(): void
    {
        $project = Project::query()->firstOrFail();

        $this->getJson(route('api.v1.web.projects.show', $project))
            ->assertOk()
            ->assertJsonPath('data.id', $project->id)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'location',
                    'total_lots',
                    'lots_count',
                    'free_lots_count',
                    'images',
                    'videos',
                ],
            ]);
    }

    public function test_catalog_returns_public_storage_urls_for_images(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $storedPath = UploadedFile::fake()->image('plan.png')->store("projects/{$project->id}/images", 'public');
        ProjectAsset::create([
            'project_id' => $project->id,
            'kind' => 'image',
            'title' => 'Plan',
            'file_name' => 'plan.png',
            'file_path' => $storedPath,
            'mime_type' => 'image/png',
            'file_size' => 500,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $response = $this->getJson(route('api.v1.web.projects.show', $project));

        $response->assertOk();
        $url = $response->json('data.images.0.url');
        $this->assertIsString($url);
        $this->assertStringContainsString('/storage/', $url);
        $this->assertStringContainsString($storedPath, $url);
    }

    public function test_public_asset_route_redirects_to_storage_url(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $storedPath = UploadedFile::fake()->image('plan.png')->store("projects/{$project->id}/images", 'public');
        $asset = ProjectAsset::create([
            'project_id' => $project->id,
            'kind' => 'image',
            'title' => 'Plan',
            'file_name' => 'plan.png',
            'file_path' => $storedPath,
            'mime_type' => 'image/png',
            'file_size' => 500,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $expectedUrl = Storage::disk('public')->url($storedPath);

        $this->get(route('api.v1.web.projects.assets.show', [$project, $asset]))
            ->assertRedirect($expectedUrl);
    }

    public function test_projects_catalog_excludes_projects_not_visible_on_web(): void
    {
        $hidden = Project::query()->firstOrFail();
        $hidden->update(['is_web' => false]);

        $response = $this->getJson(route('api.v1.web.projects.index', $this->indexQuery()));

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($hidden->id, $ids);
    }

    public function test_show_returns_not_found_when_project_is_not_visible_on_web(): void
    {
        $project = Project::query()->firstOrFail();
        $project->update(['is_web' => false]);

        $this->getJson(route('api.v1.web.projects.show', $project))
            ->assertNotFound();
    }

    public function test_projects_catalog_filters_by_tipo_web(): void
    {
        Project::query()->update(['tipo_web' => 'lotesenremate.pe']);
        $other = Project::query()->firstOrFail();
        $other->update(['tipo_web' => 'inviertexpress.pe']);

        $this->getJson(route('api.v1.web.projects.index', $this->indexQuery([
            'tipo_web' => 'inviertexpress.pe',
        ])))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $other->id);
    }

    public function test_show_includes_image_portada_and_location_fields(): void
    {
        $project = Project::query()->firstOrFail();
        $project->update([
            'descripcion' => 'Proyecto de prueba web',
            'precio_web' => 99000,
            'image_portada' => 'https://example.test/storage/projects/1/portada.jpg',
            'province' => 'Lima',
            'district' => 'Miraflores',
            'project_zone' => 'Costa',
            'registry_status' => 'Inscrito',
        ]);

        $this->getJson(route('api.v1.web.projects.show', $project))
            ->assertOk()
            ->assertJsonPath('data.image_portada', $project->image_portada)
            ->assertJsonPath('data.province', 'Lima')
            ->assertJsonPath('data.district', 'Miraflores')
            ->assertJsonPath('data.project_zone', 'Costa')
            ->assertJsonPath('data.registry_status', 'Inscrito')
            ->assertJsonPath('data.descripcion', 'Proyecto de prueba web')
            ->assertJsonPath('data.precio_web', 99000);
    }
}
