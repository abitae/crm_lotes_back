<?php

namespace Tests\Feature\Seeders;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
use App\Models\Inmopro\Project360Label;
use App\Models\Inmopro\Project360Polygon;
use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Support\FileStorage;
use Database\Seeders\Inmopro\Project360Seeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Project360SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_360_seeder_is_idempotent_and_creates_demo_tour(): void
    {
        Storage::fake('public');

        $this->seed(Project360Seeder::class);
        $this->seed(Project360Seeder::class);

        $demo = Project::query()->where('name', Project360Seeder::DEMO_PROJECT_NAME)->firstOrFail();
        $tour = Project360Tour::query()->where('project_id', $demo->id)->firstOrFail();

        $this->assertSame(3, $demo->panoramas()->count());
        $this->assertDatabaseHas('project_assets', [
            'project_id' => $demo->id,
            'kind' => ProjectAsset::KIND_PANORAMA,
            'title' => Project360Seeder::PANORAMA_ENTRADA,
        ]);
        $this->assertSame(4, Project360Hotspot::query()->where('project_360_tour_id', $tour->id)->count());
        if (Schema::hasTable('project_360_labels')) {
            $this->assertSame(2, Project360Label::query()->where('project_360_tour_id', $tour->id)->count());
        }
        $this->assertSame(4, Project360Polygon::query()->where('project_360_tour_id', $tour->id)->count());
        $this->assertSame(3, $tour->polygons()->whereNotNull('lot_id')->count());
        $this->assertTrue(
            Project360ShareLink::query()
                ->where('project_360_tour_id', $tour->id)
                ->where('label', Project360Seeder::SHARE_LINK_LABEL)
                ->exists(),
        );

        $demo->panoramas()->each(function (ProjectAsset $panorama): void {
            $this->assertSame('image/jpeg', $panorama->mime_type);
            $this->assertGreaterThan(100_000, $panorama->file_size);
            $relative = FileStorage::normalizePath((string) FileStorage::pathFromStored($panorama->file_path));
            $this->assertTrue(
                Storage::disk('public')->exists($relative) || FileStorage::exists($panorama->file_path),
                $panorama->file_path,
            );
        });

        $this->assertSame(3, $demo->lots()->count());
        $this->assertSame(3, (int) $demo->total_lots);

        Project::query()->get()->each(function (Project $project): void {
            $this->assertSame(
                (int) $project->total_lots,
                $project->lots()->count(),
                $project->name.' debe tener tantos lotes como total_lots',
            );
        });

        $sanAntonio = Project::query()->where('name', 'San Antonio 3')->firstOrFail();
        $this->assertSame(1, $sanAntonio->panoramas()->count());
        $this->assertDatabaseHas('project_assets', [
            'project_id' => $sanAntonio->id,
            'title' => Project360Seeder::PANORAMA_SAN_ANTONIO,
        ]);
    }
}
