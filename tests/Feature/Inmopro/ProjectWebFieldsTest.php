<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\City;
use App\Models\Inmopro\Project;
use App\Models\User;
use App\Support\FileStorage;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ProjectTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectWebFieldsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ProjectTypeSeeder::class);
        $this->seed(CitySeeder::class);
    }

    public function test_store_project_with_web_and_location_fields(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $city = City::query()->where('code', 'LIM')->firstOrFail();

        $response = $this->actingAs($user)->post(route('inmopro.projects.store'), [
            'name' => 'Proyecto Web Test',
            'location' => 'https://www.google.com/maps/search/?api=1&query=Lima%2C%20Peru',
            'total_lots' => 0,
            'blocks' => ['A'],
            'city_id' => $city->id,
            'province' => 'Lima',
            'district' => 'Surco',
            'project_zone' => 'Zona A',
            'registry_status' => 'Inscrito',
            'descripcion' => 'Descripción para la web del proyecto.',
            'precio_web' => 125000.5,
            'is_active' => true,
            'is_web' => true,
            'tipo_web' => 'lotesenremate.pe',
            'portada_file' => UploadedFile::fake()->image('portada.jpg'),
        ]);

        $response->assertRedirect(route('inmopro.projects.index'));

        $project = Project::query()->where('name', 'Proyecto Web Test')->firstOrFail();

        $this->assertSame($city->id, $project->city_id);
        $this->assertSame('Lima', $project->province);
        $this->assertSame('Surco', $project->district);
        $this->assertSame('Zona A', $project->project_zone);
        $this->assertSame('Inscrito', $project->registry_status);
        $this->assertSame('Descripción para la web del proyecto.', $project->descripcion);
        $this->assertEquals(125000.5, (float) $project->precio_web);
        $this->assertTrue($project->is_web);
        $this->assertSame('lotesenremate.pe', $project->tipo_web);
        $this->assertSame("projects/{$project->id}/portada.jpg", $project->image_portada);
        Storage::disk('public')->assertExists("projects/{$project->id}/portada.jpg");
        $this->assertStringContainsString('portada.jpg', (string) FileStorage::url($project->image_portada));
    }

    public function test_update_project_can_remove_portada(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $project = Project::query()->create([
            'name' => 'Proyecto con portada',
            'location' => 'https://www.google.com/maps/search/?api=1&query=Lima',
            'total_lots' => 10,
            'blocks' => ['A'],
            'is_active' => true,
            'is_web' => true,
            'tipo_web' => 'lotesenremate.pe',
        ]);

        $storedPath = UploadedFile::fake()->image('old.jpg')->store("projects/{$project->id}", 'public');
        $project->update([
            'image_portada' => $storedPath,
        ]);

        $response = $this->actingAs($user)->post(route('inmopro.projects.update', $project), [
            '_method' => 'put',
            'name' => $project->name,
            'blocks' => ['A'],
            'is_active' => true,
            'is_web' => true,
            'tipo_web' => 'lotesenremate.pe',
            'remove_portada' => true,
        ]);

        $response->assertRedirect(route('inmopro.projects.index'));

        $project->refresh();
        $this->assertNull($project->image_portada);
    }
}
