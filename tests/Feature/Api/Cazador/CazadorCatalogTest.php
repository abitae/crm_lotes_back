<?php

namespace Tests\Feature\Api\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
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

class CazadorCatalogTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_projects_index_requires_authentication(): void
    {
        $this->getJson(route('api.v1.cazador.projects.index'))
            ->assertUnauthorized();
    }

    public function test_advisor_can_list_projects(): void
    {
        $advisor = Advisor::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.projects.index'))
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'location', 'total_lots', 'lots_count'],
                ],
            ]);

        $this->assertGreaterThan(0, Project::query()->count());
    }

    public function test_advisor_can_show_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        Storage::fake('public');
        $storedPath = UploadedFile::fake()->image('masterplan.png')->store("projects/{$project->id}/images", 'public');
        ProjectAsset::create([
            'project_id' => $project->id,
            'kind' => 'image',
            'title' => 'Masterplan',
            'file_name' => 'masterplan.png',
            'file_path' => $storedPath,
            'mime_type' => 'image/png',
            'file_size' => 1234,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.projects.show', $project))
            ->assertOk()
            ->assertJsonPath('data.id', $project->id)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'location', 'total_lots', 'lots_count', 'blocks', 'images', 'documents'],
            ]);
    }

    public function test_advisor_can_download_project_asset(): void
    {
        Storage::fake('public');

        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        $storedPath = UploadedFile::fake()->create('brochure.pdf', 120, 'application/pdf')->store("projects/{$project->id}/documents", 'public');
        $asset = ProjectAsset::create([
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

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->get(route('api.v1.cazador.projects.assets.download', [$project, $asset]));

        $response->assertOk();
        $this->assertStringContainsString('attachment', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_panorama_assets_are_not_exposed_in_legacy_catalog_payloads(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
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

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.projects.show', $project))
            ->assertOk();

        $this->assertNotContains($panorama->id, collect($response->json('data.assets'))->pluck('id')->all());
        $this->assertNotContains($panorama->id, collect($response->json('data.images'))->pluck('id')->all());

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->get(route('api.v1.cazador.projects.assets.download', [$project, $panorama]))
            ->assertNotFound();
    }

    public function test_advisor_can_list_lots_available_by_default(): void
    {
        $advisor = Advisor::firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.lots.index'))
            ->assertOk();

        $rows = $response->json('data');
        $this->assertIsArray($rows);

        foreach ($rows as $row) {
            $this->assertSame('LIBRE', $row['status']['code'] ?? null);
        }
    }

    public function test_advisor_can_list_lots_including_non_available_when_disabled(): void
    {
        $advisor = Advisor::firstOrFail();
        $total = Lot::query()->count();
        $this->assertGreaterThan(0, $total);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.lots.index', ['available_only' => false]))
            ->assertOk();

        $this->assertCount($total, $response->json('data'));
    }

    public function test_advisor_can_show_lot_detail(): void
    {
        $advisor = Advisor::firstOrFail();
        $lot = Lot::query()->firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.lots.show', $lot))
            ->assertOk()
            ->assertJsonPath('data.id', $lot->id)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'block',
                    'number',
                    'project',
                    'status',
                    'can_pre_reserve',
                    'pre_reservations',
                ],
            ]);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertOk()->json('token');
    }
}
