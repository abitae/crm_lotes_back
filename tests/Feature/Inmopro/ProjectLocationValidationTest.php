<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectType;
use App\Models\User;
use Database\Seeders\Inmopro\ProjectTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class ProjectLocationValidationTest extends TestCase
{
    use RefreshDatabase;

    private const VALID_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Lima';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ProjectTypeSeeder::class);
    }

    public function test_store_project_accepts_valid_google_maps_url(): void
    {
        $user = User::factory()->create();
        $projectType = ProjectType::query()->firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.projects.store'), [
                'name' => 'Proyecto Maps',
                'project_type_id' => $projectType->id,
                'location' => self::VALID_MAPS_URL,
                'total_lots' => 0,
                'blocks' => [],
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.projects.index'));

        $this->assertDatabaseHas('projects', [
            'name' => 'Proyecto Maps',
            'location' => self::VALID_MAPS_URL,
        ]);
    }

    public function test_store_project_rejects_non_google_maps_url(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.projects.store'), [
                'name' => 'Proyecto Invalido',
                'location' => 'https://example.com/ubicacion',
            ])
            ->assertSessionHasErrors('location');
    }

    public function test_update_project_rejects_plain_text_location(): void
    {
        $user = User::factory()->create();
        $project = Project::query()->create([
            'name' => 'Proyecto Legacy',
            'location' => 'Huancayo',
            'total_lots' => 10,
            'blocks' => ['A'],
        ]);

        $this->actingAs($user)
            ->put(route('inmopro.projects.update', $project), [
                'name' => $project->name,
                'location' => 'Lima',
            ])
            ->assertSessionHasErrors('location');
    }

    public function test_import_preview_requires_valid_google_maps_url(): void
    {
        $user = User::factory()->create();
        $projectType = ProjectType::query()->firstOrFail();
        $file = $this->makeSpreadsheetFile();

        $this->actingAs($user)
            ->post(route('inmopro.projects.import-preview'), [
                'file' => $file,
                'project_type_id' => $projectType->id,
                'location' => 'Lima',
            ])
            ->assertSessionHasErrors('location');
    }

    public function test_import_preview_accepts_valid_google_maps_url(): void
    {
        $user = User::factory()->create();
        $projectType = ProjectType::query()->firstOrFail();
        $file = $this->makeSpreadsheetFile();

        $this->actingAs($user)
            ->post(route('inmopro.projects.import-preview'), [
                'file' => $file,
                'project_type_id' => $projectType->id,
                'location' => self::VALID_MAPS_URL,
            ])
            ->assertOk()
            ->assertJsonPath('project.location', self::VALID_MAPS_URL);
    }

    private function makeSpreadsheetFile(): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Proyecto Demo');
        $sheet->fromArray([
            ['ITEM', 'MANZANA', 'LOTE', 'AREA', 'PRECIO', 'CLIENTE', 'TELEFONO', 'DNI', 'ESTADO'],
            ['1', 'A', '1', '100', '10000', '', '', '', 'LIBRE'],
        ]);

        $path = tempnam(sys_get_temp_dir(), 'project-import-').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'proyecto.xlsx', null, null, true);
    }
}
