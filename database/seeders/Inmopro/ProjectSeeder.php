<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectType;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call(ProjectTypeSeeder::class);
        $projectTypes = ProjectType::query()->orderBy('sort_order')->get()->values();

        $projects = [
            ['name' => 'Villa Norte - Mito', 'location' => 'https://www.google.com/maps/search/?api=1&query=Mito%2C%20Peru', 'total_lots' => 45, 'blocks' => ['A', 'B', 'C'], 'project_type_code' => 'RESIDENCIAL'],
            ['name' => 'San Antonio 3', 'location' => 'https://www.google.com/maps/search/?api=1&query=Orcotuna%2C%20Peru', 'total_lots' => 80, 'blocks' => ['A', 'B', 'C', 'D', 'E', 'F'], 'project_type_code' => 'CONDOMINIO'],
            ['name' => 'Mirador 3.1', 'location' => 'https://www.google.com/maps/search/?api=1&query=Huancayo%2C%20Peru', 'total_lots' => 50, 'blocks' => ['A', 'B'], 'project_type_code' => 'CAMPESTRE'],
            ['name' => 'Residencial Los Olivos', 'location' => 'https://www.google.com/maps/search/?api=1&query=Concepci%C3%B3n%2C%20Peru', 'total_lots' => 120, 'blocks' => ['A', 'B', 'C', 'D', 'E', 'F', 'G'], 'project_type_code' => 'RESIDENCIAL'],
        ];

        foreach ($projects as $project) {
            $code = $project['project_type_code'] ?? null;
            unset($project['project_type_code']);
            $typeId = null;
            if (is_string($code)) {
                $typeId = $projectTypes->firstWhere('code', $code)?->id;
            }
            $project['project_type_id'] = $typeId;

            Project::firstOrCreate(
                ['name' => $project['name'], 'location' => $project['location']],
                $project
            );
        }
    }
}
