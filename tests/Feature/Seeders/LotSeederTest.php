<?php

namespace Tests\Feature\Seeders;

use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LotSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_lot_seeder_fills_empty_projects_to_match_total_lots(): void
    {
        $this->seed(LotStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(LotSeeder::class);
        $this->seed(LotSeeder::class);

        $this->assertTrue(LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->exists());

        Project::query()->get()->each(function (Project $project): void {
            $this->assertSame(
                (int) $project->total_lots,
                $project->lots()->count(),
                $project->name,
            );
            $this->assertSame(
                $project->lots()->count(),
                $project->lots()->whereHas('status', fn ($query) => $query->where('code', LotStatus::CODE_LIBRE))->count(),
            );
        });

        $villaNorte = Project::query()->where('name', 'Villa Norte - Mito')->firstOrFail();
        $this->assertSame(45, $villaNorte->lots()->count());
        $this->assertSame(15, $villaNorte->lots()->where('block', 'A')->count());
        $this->assertSame(15, $villaNorte->lots()->where('block', 'B')->count());
        $this->assertSame(15, $villaNorte->lots()->where('block', 'C')->count());
    }
}
