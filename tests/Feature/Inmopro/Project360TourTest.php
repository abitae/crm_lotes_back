<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class Project360TourTest extends TestCase
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

    public function test_view_and_manage_permissions_are_independent(): void
    {
        $project = $this->createProject();
        $viewer = User::factory()->create();
        $viewer->syncRoles([]);
        $viewer->givePermissionTo('inmopro.project-360.index');

        $this->actingAs($viewer)
            ->get(route('inmopro.project-360.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/project-360/index')
                ->where('canManage', false));

        $this->actingAs($viewer)
            ->get(route('inmopro.project-360.show', $project))
            ->assertOk();

        $this->actingAs($viewer)
            ->post(route('inmopro.project-360.panoramas.store', $project), [])
            ->assertForbidden();

        $manager = User::factory()->create();
        $manager->syncRoles([]);
        $manager->givePermissionTo([
            'inmopro.project-360.index',
            'inmopro.project-360.manage',
        ]);

        $this->actingAs($manager)
            ->get(route('inmopro.project-360.show', $project))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('canManage', true));
    }

    public function test_panorama_upload_validates_format_and_creates_starting_scene(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.panoramas.store', $project), [
                'panorama_files' => [
                    $this->fakePng('entrada.png', 2048, 1024),
                ],
                'panorama_titles' => ['Entrada principal'],
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.panoramas.store', $project), [
                'panorama_files' => [
                    $this->fakePng('casi-2-1.png', 4096, 2050),
                ],
                'panorama_titles' => ['Casi 2:1'],
            ])
            ->assertSessionHasNoErrors();

        $panorama = ProjectAsset::query()
            ->where('project_id', $project->id)
            ->where('kind', ProjectAsset::KIND_PANORAMA)
            ->where('title', 'Entrada principal')
            ->firstOrFail();
        $tour = Project360Tour::query()->where('project_id', $project->id)->firstOrFail();

        $this->assertSame('Entrada principal', $panorama->title);
        $this->assertSame($panorama->id, $tour->start_panorama_id);
        Storage::disk('public')->assertExists($panorama->file_path);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.panoramas.store', $project), [
                'panorama_files' => [
                    $this->fakePng('incorrecta.png', 2048, 1200),
                ],
                'panorama_titles' => ['Formato incorrecto'],
            ])
            ->assertSessionHasErrors(['panorama_files.0', 'panorama_files']);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.panoramas.store', $project), [
                'panorama_files' => [
                    $this->fakePng('pequena.png', 1024, 512),
                ],
                'panorama_titles' => ['Resolución insuficiente'],
            ])
            ->assertSessionHasErrors(['panorama_files.0', 'panorama_files']);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.panoramas.store', $project), [
                'panorama_files' => [
                    UploadedFile::fake()->create('documento.pdf', 100, 'application/pdf'),
                ],
                'panorama_titles' => ['Formato incorrecto'],
            ])
            ->assertSessionHasErrors(['panorama_files.0', 'panorama_files']);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.panoramas.store', $project), [
                'panorama_files' => [
                    UploadedFile::fake()->create('pesada.png', 20 * 1024 + 1, 'image/png'),
                ],
                'panorama_titles' => ['Archivo demasiado grande'],
            ])
            ->assertSessionHasErrors(['panorama_files.0', 'panorama_files']);
    }

    public function test_hotspots_require_panoramas_from_same_project(): void
    {
        $manager = $this->manager();
        $project = $this->createProject('Proyecto A');
        $otherProject = $this->createProject('Proyecto B');
        $source = $this->createPanorama($project, 'Entrada', 1);
        $target = $this->createPanorama($project, 'Sala', 2);
        $foreignTarget = $this->createPanorama($otherProject, 'Exterior', 1);
        $regularImage = ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => 'image',
            'title' => 'Plano',
            'file_name' => 'plano.jpg',
            'file_path' => "projects/{$project->id}/images/plano.jpg",
            'mime_type' => 'image/jpeg',
            'file_size' => 1000,
            'sort_order' => 3,
            'is_active' => true,
        ]);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.hotspots.store', $project), [
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $target->id,
                'label' => 'Ir a la sala',
                'yaw' => 45.25,
                'pitch' => -8.5,
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('project_360_hotspots', [
            'source_panorama_id' => $source->id,
            'target_panorama_id' => $target->id,
            'label' => 'Ir a la sala',
        ]);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.hotspots.store', $project), [
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $foreignTarget->id,
                'label' => 'Destino inválido',
                'yaw' => 0,
                'pitch' => 0,
            ])
            ->assertSessionHasErrors(['target_panorama_id']);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.hotspots.store', $project), [
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $regularImage->id,
                'label' => 'Archivo normal',
                'yaw' => 0,
                'pitch' => 0,
            ])
            ->assertSessionHasErrors(['target_panorama_id']);

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.hotspots.store', $project), [
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $source->id,
                'label' => 'Mismo panorama',
                'yaw' => 0,
                'pitch' => 0,
            ])
            ->assertSessionHasErrors(['target_panorama_id']);
    }

    public function test_deleting_starting_panorama_removes_hotspots_and_selects_fallback(): void
    {
        $manager = $this->manager();
        $project = $this->createProject();
        $first = $this->createPanorama($project, 'Primero', 1);
        $second = $this->createPanorama($project, 'Segundo', 2);
        $tour = Project360Tour::query()->create([
            'project_id' => $project->id,
            'start_panorama_id' => $first->id,
        ]);
        Project360Hotspot::query()->create([
            'project_360_tour_id' => $tour->id,
            'source_panorama_id' => $first->id,
            'target_panorama_id' => $second->id,
            'label' => 'Siguiente',
            'yaw' => 0,
            'pitch' => 0,
        ]);

        $this->actingAs($manager)
            ->delete(route('inmopro.project-360.panoramas.destroy', [$project, $first]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($first);
        $this->assertDatabaseCount('project_360_hotspots', 0);
        $this->assertSame($second->id, $tour->fresh()->start_panorama_id);
        Storage::disk('public')->assertMissing($first->file_path);
    }

    public function test_manager_can_create_multiple_labeled_links_and_revoke_one(): void
    {
        $manager = $this->manager();
        $emptyProject = $this->createProject('Proyecto vacío');

        $this->actingAs($manager)
            ->post(route('inmopro.project-360.share-links.store', $emptyProject), [
                'label' => 'No disponible',
            ])
            ->assertSessionHasErrors(['label']);

        $project = $this->createProject();
        $panorama = $this->createPanorama($project, 'Principal', 1);
        Project360Tour::query()->create([
            'project_id' => $project->id,
            'start_panorama_id' => $panorama->id,
        ]);

        foreach (['Sala de ventas', 'Cliente final'] as $label) {
            $this->actingAs($manager)
                ->post(route('inmopro.project-360.share-links.store', $project), [
                    'label' => $label,
                ])
                ->assertSessionHasNoErrors();
        }

        $this->assertDatabaseCount('project_360_share_links', 2);
        $shareLink = $project->tour360->shareLinks()->where('label', 'Sala de ventas')->firstOrFail();

        $this->actingAs($manager)
            ->patch(route('inmopro.project-360.share-links.revoke', [$project, $shareLink]))
            ->assertSessionHasNoErrors();

        $this->assertNotNull($shareLink->fresh()->revoked_at);
        $this->assertDatabaseHas('project_360_share_links', [
            'label' => 'Cliente final',
            'revoked_at' => null,
        ]);
    }

    public function test_manager_can_update_starting_scene_and_hotspot_then_delete_it(): void
    {
        $manager = $this->manager();
        $project = $this->createProject();
        $first = $this->createPanorama($project, 'Entrada', 1);
        $second = $this->createPanorama($project, 'Sala', 2);
        $tour = Project360Tour::query()->create([
            'project_id' => $project->id,
            'start_panorama_id' => $first->id,
        ]);

        $this->actingAs($manager)
            ->patch(route('inmopro.project-360.panoramas.update', [$project, $first]), [
                'title' => 'Ingreso principal',
            ])
            ->assertSessionHasNoErrors();
        $this->actingAs($manager)
            ->put(route('inmopro.project-360.start-panorama.update', $project), [
                'panorama_id' => $second->id,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('Ingreso principal', $first->fresh()->title);
        $this->assertSame($second->id, $tour->fresh()->start_panorama_id);

        $hotspot = $tour->hotspots()->create([
            'source_panorama_id' => $first->id,
            'target_panorama_id' => $second->id,
            'label' => 'Ir a sala',
            'yaw' => 10,
            'pitch' => 2,
        ]);

        $this->actingAs($manager)
            ->put(route('inmopro.project-360.hotspots.update', [$project, $hotspot]), [
                'source_panorama_id' => $first->id,
                'target_panorama_id' => $second->id,
                'label' => 'Entrar a la sala',
                'yaw' => -45,
                'pitch' => 8,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('Entrar a la sala', $hotspot->fresh()->label);
        $this->assertSame(-45.0, $hotspot->fresh()->yaw);

        $this->actingAs($manager)
            ->delete(route('inmopro.project-360.hotspots.destroy', [$project, $hotspot]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($hotspot);
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

    private function createPanorama(Project $project, string $title, int $sortOrder): ProjectAsset
    {
        $fileName = "panorama_{$project->id}_{$sortOrder}.jpg";
        $path = UploadedFile::fake()
            ->create($fileName, 1, 'image/jpeg')
            ->storeAs("projects/{$project->id}/panoramas", $fileName, 'public');

        return ProjectAsset::query()->create([
            'project_id' => $project->id,
            'kind' => ProjectAsset::KIND_PANORAMA,
            'title' => $title,
            'file_name' => $fileName,
            'file_path' => $path,
            'mime_type' => 'image/jpeg',
            'file_size' => 1000,
            'sort_order' => $sortOrder,
            'is_active' => true,
        ]);
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
