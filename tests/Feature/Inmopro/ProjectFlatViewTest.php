<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectFlatPolygon;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProjectFlatViewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Permission::findOrCreate('inmopro.project-flat.index', 'web');
        Permission::findOrCreate('inmopro.project-flat.manage', 'web');
        config()->set('services.google.maps_api_key', 'test-maps-key');
    }

    public function test_index_and_show_require_index_permission(): void
    {
        $project = $this->createProject();
        $viewer = User::factory()->create();
        $viewer->syncRoles([]);

        $this->actingAs($viewer)
            ->get(route('inmopro.project-flat.index'))
            ->assertForbidden();

        $this->actingAs($viewer)
            ->get(route('inmopro.project-flat.show', $project))
            ->assertForbidden();
    }

    public function test_viewer_can_open_index_and_show_but_cannot_manage_polygons(): void
    {
        $project = $this->createProject('-12.046374,-77.042793');
        $viewer = User::factory()->create();
        $viewer->syncRoles([]);
        $viewer->givePermissionTo('inmopro.project-flat.index');

        $this->actingAs($viewer)
            ->get(route('inmopro.project-flat.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/project-flat/index')
                ->where('canManage', false));

        $this->actingAs($viewer)
            ->get(route('inmopro.project-flat.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/project-flat/show')
                ->where('googleMapsApiKey', 'test-maps-key')
                ->where('mapsCenter.lat', -12.046374)
                ->where('mapsCenter.lng', -77.042793)
                ->where('canManage', false));

        $this->actingAs($viewer)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon())
            ->assertForbidden();
    }

    public function test_manager_can_create_update_and_delete_polygon(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();

        $this->actingAs($manager)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon([
                'title' => 'Área común',
                'description' => 'Parque',
            ]))
            ->assertSessionHasNoErrors();

        $polygon = $project->flatPolygons()->firstOrFail();
        $this->assertSame('Área común', $polygon->title);
        $this->assertCount(4, $polygon->vertices);

        $this->actingAs($manager)
            ->put(route('inmopro.project-flat.polygons.update', [$project, $polygon]), $this->validPolygon([
                'title' => 'Área común principal',
                'vertices' => $polygon->vertices,
            ]))
            ->assertSessionHasNoErrors();

        $this->assertSame('Área común principal', $polygon->fresh()->title);

        $this->actingAs($manager)
            ->delete(route('inmopro.project-flat.polygons.destroy', [$project, $polygon]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($polygon);
    }

    public function test_polygon_can_be_linked_to_a_project_lot(): void
    {
        $project = $this->createProject();
        $status = $this->createStatus();
        $lot = $this->createLot($project, $status, 12);
        $manager = $this->manager();

        $this->actingAs($manager)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon([
                'lot_id' => $lot->id,
                'title' => null,
            ]))
            ->assertSessionHasNoErrors();

        $polygon = $project->flatPolygons()->firstOrFail();
        $this->assertSame($lot->id, $polygon->lot_id);
        $this->assertSame('Lote 12', $polygon->title);
        $this->assertSame('#f97316', $polygon->color);
    }

    public function test_custom_label_and_color_are_kept_when_linked_to_a_lot(): void
    {
        $project = $this->createProject();
        $status = $this->createStatus();
        $lot = $this->createLot($project, $status, 8);
        $manager = $this->manager();

        $this->actingAs($manager)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon([
                'lot_id' => $lot->id,
                'title' => 'Esquina parque',
                'color' => '#2563eb',
                'hover_color' => '#60a5fa',
            ]))
            ->assertSessionHasNoErrors();

        $polygon = $project->flatPolygons()->firstOrFail();
        $this->assertSame('Esquina parque', $polygon->title);
        $this->assertSame('#2563eb', $polygon->color);

        $this->actingAs($manager)
            ->put(route('inmopro.project-flat.polygons.update', [$project, $polygon]), $this->validPolygon([
                'lot_id' => $lot->id,
                'title' => 'Lote 8 norte',
                'color' => '#dc2626',
                'hover_color' => '#f87171',
                'vertices' => $polygon->vertices,
            ]))
            ->assertSessionHasNoErrors();

        $polygon->refresh();
        $this->assertSame('Lote 8 norte', $polygon->title);
        $this->assertSame('#dc2626', $polygon->color);
    }

    public function test_lot_cannot_be_linked_twice_or_from_another_project(): void
    {
        $project = $this->createProject();
        $other = $this->createProject('Otro');
        $status = $this->createStatus();
        $lot = $this->createLot($project, $status, 1);
        $foreignLot = $this->createLot($other, $status, 2);
        $manager = $this->manager();

        ProjectFlatPolygon::query()->create([
            'project_id' => $project->id,
            'lot_id' => $lot->id,
            'title' => 'Lote 1',
            'vertices' => $this->validPolygon()['vertices'],
            'color' => '#f97316',
            'hover_color' => '#fb923c',
            'opacity' => 0.35,
        ]);

        $this->actingAs($manager)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon([
                'lot_id' => $lot->id,
                'title' => null,
            ]))
            ->assertSessionHasErrors('lot_id');

        $this->actingAs($manager)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon([
                'lot_id' => $foreignLot->id,
                'title' => null,
            ]))
            ->assertSessionHasErrors('lot_id');
    }

    public function test_self_intersecting_polygon_is_rejected(): void
    {
        $project = $this->createProject();
        $manager = $this->manager();

        $this->actingAs($manager)
            ->post(route('inmopro.project-flat.polygons.store', $project), $this->validPolygon([
                'vertices' => [
                    ['lat' => -12.04, 'lng' => -77.04],
                    ['lat' => -12.05, 'lng' => -77.03],
                    ['lat' => -12.04, 'lng' => -77.03],
                    ['lat' => -12.05, 'lng' => -77.04],
                ],
            ]))
            ->assertSessionHasErrors('vertices');
    }

    public function test_show_returns_null_maps_center_without_coordinates(): void
    {
        $project = $this->createProject('Lima');
        $manager = $this->manager();

        $this->actingAs($manager)
            ->get(route('inmopro.project-flat.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('mapsCenter', null));
    }

    public function test_show_hides_api_key_when_missing(): void
    {
        config()->set('services.google.maps_api_key', '');
        $project = $this->createProject();
        $manager = $this->manager();

        $this->actingAs($manager)
            ->get(route('inmopro.project-flat.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('googleMapsApiKey', null));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validPolygon(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Manzana A',
            'description' => null,
            'vertices' => [
                ['lat' => -12.0460, 'lng' => -77.0430],
                ['lat' => -12.0460, 'lng' => -77.0420],
                ['lat' => -12.0470, 'lng' => -77.0420],
                ['lat' => -12.0470, 'lng' => -77.0430],
            ],
            'color' => '#f97316',
            'hover_color' => '#fb923c',
            'opacity' => 0.35,
        ], $overrides);
    }

    private function manager(): User
    {
        $manager = User::factory()->create();
        $manager->syncRoles([]);
        $manager->givePermissionTo([
            'inmopro.project-flat.index',
            'inmopro.project-flat.manage',
        ]);

        return $manager;
    }

    private function createProject(string $location = '-12.046374,-77.042793'): Project
    {
        return Project::query()->create([
            'name' => 'Proyecto plano',
            'location' => $location,
            'total_lots' => 10,
            'blocks' => ['A'],
            'is_active' => true,
        ]);
    }

    private function createStatus(): LotStatus
    {
        return LotStatus::query()->create([
            'name' => 'Libre',
            'code' => LotStatus::CODE_LIBRE,
            'color' => '#22c55e',
            'sort_order' => 1,
        ]);
    }

    private function createLot(Project $project, LotStatus $status, int $number): Lot
    {
        return Lot::query()->create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => $number,
            'area' => 120,
            'price' => 50000,
            'lot_status_id' => $status->id,
        ]);
    }
}
