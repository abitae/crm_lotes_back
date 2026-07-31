<?php

namespace Tests\Feature\Inmopro;

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
use Illuminate\Support\Facades\URL;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class Project360EnhancementsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        config()->set('cazador.default_storage_disk', 'public');
        Permission::findOrCreate('inmopro.project-360.index', 'web');
        Permission::findOrCreate('inmopro.project-360.manage', 'web');
    }

    public function test_new_editor_routes_require_manage_permission(): void
    {
        $project = $this->createProject();
        $panorama = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada');
        $viewer = User::factory()->create();
        $viewer->syncRoles([]);
        $viewer->givePermissionTo('inmopro.project-360.index');

        $this->actingAs($viewer)
            ->put(route('inmopro.project-360.settings.update', $project), $this->validTheme())
            ->assertForbidden();

        $this->actingAs($viewer)
            ->put(route('inmopro.project-360.scene-settings.update', $project), [
                'panorama_id' => $panorama->id,
                'initial_yaw' => 0,
                'initial_pitch' => 0,
            ])
            ->assertForbidden();

        $this->actingAs($viewer)
            ->post(route('inmopro.project-360.floor-plans.store', $project), [])
            ->assertForbidden();
    }

    public function test_floor_plan_upload_validates_dimensions_and_stores_without_ratio_requirement(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.floor-plans.store', $project), [
                'floor_plan_files' => [$this->fakePng('primer-piso.png', 800, 600)],
                'floor_plan_titles' => ['Primer piso'],
            ])
            ->assertSessionHasNoErrors();

        $floorPlan = $project->floorPlans()->firstOrFail();
        $this->assertSame(ProjectAsset::KIND_FLOOR_PLAN, $floorPlan->kind);
        $this->assertStringContainsString('/floor-plans/', $floorPlan->file_path);
        Storage::disk('public')->assertExists($floorPlan->file_path);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.floor-plans.store', $project), [
                'floor_plan_files' => [$this->fakePng('pequeno.png', 599, 600)],
                'floor_plan_titles' => ['Inválido'],
            ])
            ->assertSessionHasErrors(['floor_plan_files.0']);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.floor-plans.store', $project), [
                'floor_plan_files' => [
                    UploadedFile::fake()->create('plano.pdf', 20, 'application/pdf'),
                ],
                'floor_plan_titles' => ['PDF'],
            ])
            ->assertSessionHasErrors(['floor_plan_files.0']);
    }

    public function test_theme_is_inherited_and_hotspot_overrides_are_returned_in_payload(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();
        $source = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada', 1);
        $target = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Sala', 2);

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.settings.update', $project), $this->validTheme([
                'hotspot_color' => '#123456',
                'hotspot_shape' => 'ring',
                'hotspot_size' => 0.22,
            ]))
            ->assertSessionHasNoErrors();

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.hotspots.store', $project), [
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $target->id,
                'label' => 'Ir a la sala',
                'yaw' => 35.125,
                'pitch' => -4.5,
                'color' => '#abcdef',
                'shape' => 'pin',
                'size' => 0.3,
                'label_visibility' => 'hover',
                'pulse_enabled' => false,
            ])
            ->assertSessionHasNoErrors();

        $payload = app(Project360TourService::class)->payload(
            $project,
            fn (ProjectAsset $asset): string => '/'.$asset->file_path,
        );

        $this->assertSame('#123456', $payload['settings']['hotspot_color']);
        $this->assertSame('#abcdef', $payload['hotspots'][0]['style']['color']);
        $this->assertSame('pin', $payload['hotspots'][0]['style']['shape']);
        $this->assertSame('#fb923c', $payload['hotspots'][0]['style']['hover_color']);
        $this->assertFalse($payload['hotspots'][0]['style']['pulse_enabled']);
    }

    public function test_theme_hotspot_and_scene_values_are_validated(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();
        $source = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada', 1);
        $target = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Sala', 2);
        $floorPlan = $this->createAsset($project, ProjectAsset::KIND_FLOOR_PLAN, 'Plano');

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.settings.update', $project), $this->validTheme([
                'hotspot_color' => 'orange',
                'hotspot_size' => 0.6,
                'hotspot_shape' => 'cube',
            ]))
            ->assertSessionHasErrors([
                'hotspot_color',
                'hotspot_size',
                'hotspot_shape',
            ]);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.hotspots.store', $project), [
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $target->id,
                'label' => 'Inválido',
                'yaw' => 181,
                'pitch' => -86,
                'color' => '#12345',
                'size' => 0.07,
            ])
            ->assertSessionHasErrors(['yaw', 'pitch', 'color', 'size']);

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.scene-settings.update', $project), [
                'panorama_id' => $source->id,
                'initial_yaw' => 0,
                'initial_pitch' => 0,
                'floor_plan_id' => $floorPlan->id,
                'plan_x' => 101,
                'plan_y' => -1,
            ])
            ->assertSessionHasErrors(['plan_x', 'plan_y']);
    }

    public function test_scene_rejects_foreign_assets_and_floor_plan_deletion_clears_association(): void
    {
        $project = $this->createProject();
        $otherProject = $this->createProject('Otro proyecto');
        $manager = $this->manager();
        $panorama = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada');
        $floorPlan = $this->createAsset($project, ProjectAsset::KIND_FLOOR_PLAN, 'Plano');
        $foreignPlan = $this->createAsset($otherProject, ProjectAsset::KIND_FLOOR_PLAN, 'Ajeno');

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.scene-settings.update', $project), [
                'panorama_id' => $panorama->id,
                'initial_yaw' => 25,
                'initial_pitch' => -6,
                'floor_plan_id' => $foreignPlan->id,
                'plan_x' => 30,
                'plan_y' => 70,
            ])
            ->assertSessionHasErrors(['floor_plan_id']);

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.scene-settings.update', $project), [
                'panorama_id' => $panorama->id,
                'initial_yaw' => 25,
                'initial_pitch' => -6,
                'floor_plan_id' => $floorPlan->id,
                'plan_x' => 30,
                'plan_y' => 70,
            ])
            ->assertSessionHasNoErrors();

        $setting = $project->tour360()->firstOrFail()->sceneSettings()->firstOrFail();
        $this->assertSame($floorPlan->id, $setting->floor_plan_id);

        $this->actingAs($manager)
            ->delete(route('inmopro.project-360.floor-plans.destroy', [$project, $floorPlan]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($floorPlan);
        $this->assertNull($setting->fresh()->floor_plan_id);
        $this->assertNull($setting->fresh()->plan_x);
        Storage::disk('public')->assertMissing($floorPlan->file_path);
    }

    public function test_signed_floor_plan_is_public_only_for_active_link_and_project(): void
    {
        $project = $this->createProject();
        $panorama = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada');
        $floorPlan = $this->createAsset($project, ProjectAsset::KIND_FLOOR_PLAN, 'Plano');
        $tour = Project360Tour::query()->create([
            'project_id' => $project->id,
            'start_panorama_id' => $panorama->id,
        ]);
        $shareLink = Project360ShareLink::query()->create([
            'project_360_tour_id' => $tour->id,
            'created_by' => User::factory()->create()->id,
            'label' => 'Cliente',
        ]);
        $url = app(Project360ShareService::class)->floorPlanUrl($shareLink, $floorPlan);

        $this->get($url)
            ->assertOk()
            ->assertHeader('content-type', 'image/jpeg');

        $this->get($url.'&altered=1')->assertForbidden();

        $shareLink->update(['revoked_at' => now()]);
        $this->get($url)->assertNotFound();

        $shareLink->update(['revoked_at' => null]);
        $project->update(['is_active' => false]);
        $this->get($url)->assertNotFound();

        $tampered = URL::signedRoute('public.project-360.floor-plans.show', [
            'shareLink' => $shareLink,
            'floorPlan' => $panorama,
        ]);
        $this->get($tampered)->assertNotFound();
    }

    private function manager(): User
    {
        $manager = User::factory()->create();
        $manager->syncRoles([]);
        $manager->givePermissionTo([
            'inmopro.project-360.index',
            'inmopro.project-360.manage',
        ]);

        return $manager;
    }

    private function createProject(string $name = 'Proyecto 360'): Project
    {
        return Project::query()->create([
            'name' => $name,
            'location' => 'Lima',
            'total_lots' => 10,
            'blocks' => ['A'],
            'is_active' => true,
        ]);
    }

    private function createAsset(
        Project $project,
        string $kind,
        string $title,
        int $sortOrder = 1,
    ): ProjectAsset {
        $extension = 'jpg';
        $fileName = "{$kind}_{$project->id}_{$sortOrder}.{$extension}";
        $directory = $kind === ProjectAsset::KIND_FLOOR_PLAN
            ? "projects/{$project->id}/floor-plans"
            : "projects/{$project->id}/panoramas";
        $path = UploadedFile::fake()
            ->create($fileName, 1, 'image/jpeg')
            ->storeAs($directory, $fileName, 'public');

        return ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => $kind,
            'title' => $title,
            'file_name' => $fileName,
            'file_path' => $path,
            'mime_type' => 'image/jpeg',
            'file_size' => 1000,
            'sort_order' => $sortOrder,
            'is_active' => true,
        ]);
    }

    /** @param array<string, mixed> $overrides */
    private function validTheme(array $overrides = []): array
    {
        return [
            'accent_color' => '#f97316',
            'hotspot_color' => '#f97316',
            'hotspot_hover_color' => '#fb923c',
            'hotspot_text_color' => '#ffffff',
            'hotspot_size' => 0.16,
            'hotspot_shape' => 'sphere',
            'hotspot_label_visibility' => 'always',
            'hotspot_pulse_enabled' => true,
            ...$overrides,
        ];
    }

    private function fakePng(string $name, int $width, int $height): UploadedFile
    {
        $signature = "\x89PNG\r\n\x1a\n";
        $header = pack('NNCCCCC', $width, $height, 8, 0, 0, 0, 0);
        $rows = str_repeat("\0".str_repeat("\0", $width), $height);
        $contents = $signature
            .$this->pngChunk('IHDR', $header)
            .$this->pngChunk('IDAT', gzcompress($rows, 9))
            .$this->pngChunk('IEND', '');

        return UploadedFile::fake()->createWithContent($name, $contents);
    }

    private function pngChunk(string $type, string $data): string
    {
        return pack('N', strlen($data))
            .$type
            .$data
            .pack('N', crc32($type.$data));
    }
}
