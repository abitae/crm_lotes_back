<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\ProjectType;
use Illuminate\Database\Seeder;

class ProjectTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            ['name' => 'Residencial', 'code' => 'RESIDENCIAL', 'description' => 'Proyectos para vivienda.', 'color' => '#0ea5e9', 'sort_order' => 1],
            ['name' => 'Condominio', 'code' => 'CONDOMINIO', 'description' => 'Conjuntos cerrados con servicios comunes.', 'color' => '#14b8a6', 'sort_order' => 2],
            ['name' => 'Campestre', 'code' => 'CAMPESTRE', 'description' => 'Proyectos de baja densidad y entorno natural.', 'color' => '#84cc16', 'sort_order' => 3],
        ];

        foreach ($types as $type) {
            ProjectType::query()->updateOrCreate(
                ['code' => $type['code']],
                $type + ['is_active' => true, 'percentage_meta' => 100],
            );
        }
    }
}
