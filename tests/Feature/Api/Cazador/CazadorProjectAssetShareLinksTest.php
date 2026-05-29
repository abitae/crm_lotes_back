<?php

namespace Tests\Feature\Api\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Cazador\ProjectAssetShareService;
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
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CazadorProjectAssetShareLinksTest extends TestCase
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

    public function test_share_links_requires_authentication(): void
    {
        $project = Project::query()->firstOrFail();

        $this->postJson(route('api.v1.cazador.projects.assets.share-links', $project), [
            'asset_ids' => [1],
        ])->assertUnauthorized();
    }

    public function test_advisor_can_generate_share_links_for_project_assets(): void
    {
        Storage::fake('public');

        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.projects.assets.share-links', $project), [
                'asset_ids' => [$asset->id],
            ])
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'share_url', 'expires_at'],
                ],
            ]);

        $shareUrl = (string) $response->json('data.0.share_url');
        $this->assertStringContainsString('signature=', $shareUrl);
        $this->assertStringContainsString('expires=', $shareUrl);
        $this->assertStringContainsString('/shared/assets/'.$asset->id, $shareUrl);

        $this->get($shareUrl)->assertOk();
    }

    public function test_shared_asset_is_served_inline_for_images(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');

        $shareUrl = app(ProjectAssetShareService::class)->buildShareLinkPayload($asset)['share_url'];

        $this->get($shareUrl)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Content-Disposition', 'inline; filename="asset.png"');
    }

    public function test_share_links_rejects_empty_asset_ids(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.projects.assets.share-links', $project), [
                'asset_ids' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['asset_ids']);
    }

    public function test_share_links_rejects_asset_from_another_project(): void
    {
        Storage::fake('public');

        $advisor = Advisor::firstOrFail();
        $projects = Project::query()->limit(2)->get();
        $this->assertCount(2, $projects);

        $foreignAsset = $this->createAsset($projects[1], 'document');

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.projects.assets.share-links', $projects[0]), [
                'asset_ids' => [$foreignAsset->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['asset_ids']);
    }

    public function test_share_links_returns_not_found_for_inactive_project(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        $project->update(['is_active' => false]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.projects.assets.share-links', $project), [
                'asset_ids' => [1],
            ])
            ->assertNotFound();
    }

    public function test_share_links_rejects_inactive_asset(): void
    {
        Storage::fake('public');

        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');
        $asset->update(['is_active' => false]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.projects.assets.share-links', $project), [
                'asset_ids' => [$asset->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['asset_ids']);
    }

    public function test_expired_share_link_is_forbidden(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');

        $shareUrl = URL::temporarySignedRoute(
            'api.v1.cazador.shared-assets.show',
            now()->subMinute(),
            ['asset' => $asset->id],
        );

        $this->get($shareUrl)->assertForbidden();
    }

    public function test_tampered_share_link_signature_is_forbidden(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');

        $shareUrl = app(ProjectAssetShareService::class)->buildShareLinkPayload($asset)['share_url'];
        $tampered = preg_replace('/signature=[^&]+/', 'signature=invalid', $shareUrl) ?? $shareUrl;

        $this->get($tampered)->assertForbidden();
    }

    public function test_inactive_asset_returns_not_found_on_shared_route(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');
        $shareUrl = app(ProjectAssetShareService::class)->buildShareLinkPayload($asset)['share_url'];

        $asset->update(['is_active' => false]);

        $this->get($shareUrl)->assertNotFound();
    }

    public function test_share_links_rejects_assets_without_file_on_disk(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        $asset = ProjectAsset::create([
            'project_id' => $project->id,
            'kind' => 'image',
            'title' => 'Sin archivo',
            'file_name' => 'missing.png',
            'file_path' => 'projects/'.$project->id.'/images/missing.png',
            'mime_type' => 'image/png',
            'file_size' => 100,
            'sort_order' => 99,
            'is_active' => true,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.projects.assets.share-links', $project), [
                'asset_ids' => [$asset->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['asset_ids']);
    }

    public function test_protected_download_still_requires_authentication(): void
    {
        Storage::fake('public');

        $project = Project::query()->firstOrFail();
        $asset = $this->createAsset($project, 'image');

        $this->get(route('api.v1.cazador.projects.assets.download', [$project, $asset]))
            ->assertUnauthorized();
    }

    private function createAsset(Project $project, string $kind): ProjectAsset
    {
        $storedPath = UploadedFile::fake()->image('asset.png')->store("projects/{$project->id}/images", 'public');

        return ProjectAsset::create([
            'project_id' => $project->id,
            'kind' => $kind,
            'title' => 'Asset demo',
            'file_name' => 'asset.png',
            'file_path' => $storedPath,
            'mime_type' => 'image/png',
            'file_size' => 1024,
            'sort_order' => 1,
            'is_active' => true,
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
