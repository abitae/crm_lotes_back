<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Models\User;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
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
            ->post(route('inmopro.project-360.polygons.store', $project), [])
            ->assertForbidden();
    }

    public function test_floor_plan_routes_are_retired_without_deleting_archived_assets(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();
        $floorPlan = $this->createAsset($project, ProjectAsset::KIND_FLOOR_PLAN, 'Primer piso');

        $this->assertFalse(Route::has('inmopro.project-360.floor-plans.store'));
        $this->assertFalse(Route::has('inmopro.project-360.floor-plans.destroy'));

        $this->actingAs($manager)
            ->post("/inmopro/project-360/{$project->id}/floor-plans")
            ->assertNotFound();

        $this->assertModelExists($floorPlan);
        Storage::disk('public')->assertExists($floorPlan->file_path);
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

    public function test_manager_can_create_update_and_delete_informational_polygon(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();
        $panorama = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada');

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.polygons.store', $project), [
                'source_panorama_id' => $panorama->id,
                'title' => 'Área social',
                'description' => 'Zona para reuniones.',
                'vertices' => [
                    ['yaw' => 170, 'pitch' => -10],
                    ['yaw' => -170, 'pitch' => -10],
                    ['yaw' => -172, 'pitch' => 8],
                    ['yaw' => 172, 'pitch' => 8],
                ],
                'color' => '#123456',
                'hover_color' => '#abcdef',
                'opacity' => 0.35,
            ])
            ->assertSessionHasNoErrors();

        $polygon = $project->tour360()->firstOrFail()->polygons()->firstOrFail();
        $payload = app(Project360TourService::class)->payload(
            $project,
            fn (ProjectAsset $asset): string => '/'.$asset->file_path,
        );

        $this->assertSame('Área social', $payload['polygons'][0]['title']);
        $this->assertCount(4, $payload['polygons'][0]['vertices']);
        $this->assertArrayNotHasKey('floor_plans', $payload);
        $this->assertArrayNotHasKey('floor_plan_id', $payload['panoramas'][0]);

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.polygons.update', [$project, $polygon]), [
                'source_panorama_id' => $panorama->id,
                'title' => 'Área social principal',
                'description' => null,
                'vertices' => $polygon->vertices,
                'color' => '#654321',
                'hover_color' => '#abcdef',
                'opacity' => 0.4,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('Área social principal', $polygon->fresh()->title);

        $this->actingAs($manager)
            ->delete(route('inmopro.project-360.polygons.destroy', [$project, $polygon]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($polygon);
    }

    public function test_polygon_rejects_foreign_panorama_and_crossed_sides(): void
    {
        $project = $this->createProject();
        $otherProject = $this->createProject('Otro proyecto');
        $manager = $this->manager();
        $foreignPanorama = $this->createAsset($otherProject, ProjectAsset::KIND_PANORAMA, 'Ajeno');
        $validStyle = [
            'title' => 'Polígono inválido',
            'description' => null,
            'color' => '#f97316',
            'hover_color' => '#fb923c',
            'opacity' => 0.28,
        ];

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.polygons.store', $project), [
                ...$validStyle,
                'source_panorama_id' => $foreignPanorama->id,
                'vertices' => [
                    ['yaw' => 0, 'pitch' => 0],
                    ['yaw' => 10, 'pitch' => 0],
                    ['yaw' => 5, 'pitch' => 10],
                ],
            ])
            ->assertSessionHasErrors(['source_panorama_id']);

        $panorama = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada');

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.polygons.store', $project), [
                ...$validStyle,
                'source_panorama_id' => $panorama->id,
                'vertices' => [
                    ['yaw' => 0, 'pitch' => 0],
                    ['yaw' => 10, 'pitch' => 10],
                    ['yaw' => 0, 'pitch' => 10],
                    ['yaw' => 10, 'pitch' => 0],
                ],
            ])
            ->assertSessionHasErrors(['vertices']);
    }

    public function test_theme_hotspot_and_scene_values_are_validated(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();
        $source = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada', 1);
        $target = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Sala', 2);

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
                'initial_yaw' => 181,
                'initial_pitch' => -86,
            ])
            ->assertSessionHasErrors(['initial_yaw', 'initial_pitch']);
    }

    public function test_scene_orientation_update_preserves_archived_floor_plan_data(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();
        $panorama = $this->createAsset($project, ProjectAsset::KIND_PANORAMA, 'Entrada');
        $floorPlan = $this->createAsset($project, ProjectAsset::KIND_FLOOR_PLAN, 'Plano');
        $tour = Project360Tour::query()->create(['project_id' => $project->id]);
        $setting = $tour->sceneSettings()->create([
            'panorama_id' => $panorama->id,
            'initial_yaw' => 0,
            'initial_pitch' => 0,
            'floor_plan_id' => $floorPlan->id,
            'plan_x' => 30,
            'plan_y' => 70,
        ]);

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.scene-settings.update', $project), [
                'panorama_id' => $panorama->id,
                'initial_yaw' => 25,
                'initial_pitch' => -6,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(25.0, $setting->fresh()->initial_yaw);
        $this->assertSame(-6.0, $setting->fresh()->initial_pitch);
        $this->assertSame($floorPlan->id, $setting->fresh()->floor_plan_id);
        $this->assertSame(30.0, $setting->fresh()->plan_x);
        $this->assertModelExists($floorPlan);
    }

    public function test_public_floor_plan_route_is_retired_without_deleting_asset(): void
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
        $this->assertFalse(Route::has('public.project-360.floor-plans.show'));
        $this->get("/tours/360/{$shareLink->id}/floor-plans/{$floorPlan->id}")
            ->assertNotFound();
        $this->assertModelExists($floorPlan);
        Storage::disk('public')->assertExists($floorPlan->file_path);
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
