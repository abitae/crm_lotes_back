<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\ProjectType;
use App\Models\User;
use Database\Seeders\Inmopro\ProjectTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTypePercentageMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_rejects_percentage_meta_out_of_range(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.project-types.store'), [
                'name' => 'Test',
                'code' => 'TEST_META',
                'description' => null,
                'color' => null,
                'sort_order' => 0,
                'percentage_meta' => 101,
                'is_active' => true,
            ])
            ->assertSessionHasErrors('percentage_meta');
    }

    public function test_store_accepts_percentage_meta_zero(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.project-types.store'), [
                'name' => 'Sin meta',
                'code' => 'SIN_META',
                'description' => null,
                'color' => null,
                'sort_order' => 0,
                'percentage_meta' => 0,
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.project-types.index'));

        $this->assertDatabaseHas('project_types', [
            'code' => 'SIN_META',
            'percentage_meta' => 0,
        ]);
    }

    public function test_seeded_project_types_default_to_full_percentage(): void
    {
        $this->seed(ProjectTypeSeeder::class);

        $this->assertSame(100, (int) ProjectType::query()->where('code', 'RESIDENCIAL')->value('percentage_meta'));
    }
}
