<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\City;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
use App\Models\Inmopro\Project360Label;
use App\Models\Inmopro\Project360Polygon;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Models\Inmopro\ProjectType;
use App\Models\User;
use App\Services\Inmopro\Project360TourService;
use App\Support\FileStorage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Proyectos y tour 360 de demostración para pruebas manuales del módulo.
 *
 * php artisan db:seed --class="Database\\Seeders\\Inmopro\\Project360Seeder"
 *
 * Crea (o reutiliza) los proyectos base y deja:
 * - Tour 360 Demo: 3 panoramas fotográficos 360, hotspots, etiquetas, polígonos ligados a lotes y enlace público.
 * - San Antonio 3: un panorama suelto para probar el editor.
 * - El resto de proyectos: sin tour, para cargar panoramas desde cero.
 */
class Project360Seeder extends Seeder
{
    public const DEMO_PROJECT_NAME = 'Tour 360 Demo';

    public const SHARE_LINK_LABEL = '[Seed] Tour demo sala de ventas';

    public const PANORAMA_ENTRADA = '[Seed] Entrada principal';

    public const PANORAMA_SOCIAL = '[Seed] Área social';

    public const PANORAMA_LOTES = '[Seed] Manzana A';

    public const PANORAMA_SAN_ANTONIO = '[Seed] Acceso';

    public function run(): void
    {
        $this->call(ProjectSeeder::class);
        $this->call(LotStatusSeeder::class);

        $demoProject = $this->demoProject();
        $lots = $this->demoLots($demoProject);
        $demoProject->forceFill([
            'total_lots' => $demoProject->lots()->count(),
        ])->save();
        $this->seedFullTour($demoProject, $lots);
        $this->call(LotSeeder::class);

        $sanAntonio = Project::query()->where('name', 'San Antonio 3')->first();
        if ($sanAntonio !== null) {
            $this->seedSinglePanorama($sanAntonio, self::PANORAMA_SAN_ANTONIO, 'acceso.jpg');
        }
    }

    private function demoProject(): Project
    {
        $limaCityId = City::query()->where('code', 'LIM')->value('id');
        $typeId = ProjectType::query()->where('code', 'RESIDENCIAL')->value('id');

        return Project::query()->firstOrCreate(
            [
                'name' => self::DEMO_PROJECT_NAME,
                'location' => 'https://www.google.com/maps/search/?api=1&query=Huancayo%2C%20Peru',
            ],
            [
                'total_lots' => 3,
                'blocks' => ['A', 'B'],
                'project_type_id' => $typeId,
                'city_id' => $limaCityId,
                'project_zone' => 'Zona demostración 360',
                'registry_status' => 'Inscrito en RRPP',
                'descripcion' => 'Proyecto de prueba para el visor y editor 360.',
                'precio_web' => 38000,
                'is_web' => true,
                'tipo_web' => 'lotesenremate.pe',
                'is_active' => true,
            ],
        );
    }

    /**
     * @return array{libre: Lot, reservado: Lot, transferido: Lot}
     */
    private function demoLots(Project $project): array
    {
        $statuses = LotStatus::query()
            ->whereIn('code', [
                LotStatus::CODE_LIBRE,
                LotStatus::CODE_RESERVADO,
                LotStatus::CODE_TRANSFERIDO,
            ])
            ->get()
            ->keyBy('code');

        return [
            'libre' => $this->lot($project, 'A', '801', $statuses->get(LotStatus::CODE_LIBRE)),
            'reservado' => $this->lot($project, 'A', '802', $statuses->get(LotStatus::CODE_RESERVADO)),
            'transferido' => $this->lot($project, 'A', '803', $statuses->get(LotStatus::CODE_TRANSFERIDO)),
        ];
    }

    private function lot(Project $project, string $block, string $number, ?LotStatus $status): Lot
    {
        $lot = Lot::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'block' => $block,
                'number' => $number,
            ],
            [
                'area' => 120,
                'price' => 42000,
                'lot_status_id' => $status?->id,
                'observations' => 'Lote de demostración para polígonos del tour 360.',
            ],
        );

        $lot->setRelation('status', $status);

        return $lot;
    }

    /**
     * @param  array{libre: Lot, reservado: Lot, transferido: Lot}  $lots
     */
    private function seedFullTour(Project $project, array $lots): void
    {
        $entrada = $this->panorama($project, self::PANORAMA_ENTRADA, 1, 'entrada.jpg');
        $social = $this->panorama($project, self::PANORAMA_SOCIAL, 2, 'area-social.jpg');
        $lotes = $this->panorama($project, self::PANORAMA_LOTES, 3, 'manzana-a.jpg');

        $tour = Project360Tour::query()->updateOrCreate(
            ['project_id' => $project->id],
            [
                ...Project360TourService::defaultTheme(),
                'start_panorama_id' => $entrada->id,
                'accent_color' => '#f97316',
                'hotspot_shape' => 'sphere',
            ],
        );

        $tour->sceneSettings()->updateOrCreate(
            ['panorama_id' => $entrada->id],
            ['initial_yaw' => 0, 'initial_pitch' => 0],
        );
        $tour->sceneSettings()->updateOrCreate(
            ['panorama_id' => $social->id],
            ['initial_yaw' => -20, 'initial_pitch' => -4],
        );
        $tour->sceneSettings()->updateOrCreate(
            ['panorama_id' => $lotes->id],
            ['initial_yaw' => 15, 'initial_pitch' => -8],
        );

        $this->hotspot($tour, $entrada, $social, 'Ir al área social', 88.0, -6.0);
        $this->hotspot($tour, $social, $entrada, 'Volver a la entrada', -92.0, -4.0);
        $this->hotspot($tour, $social, $lotes, 'Ver manzana A', 75.0, -8.0, [
            'shape' => 'pin',
            'color' => '#22c55e',
        ]);
        $this->hotspot($tour, $lotes, $social, 'Volver al área social', -110.0, -5.0);

        $this->lotPolygon($tour, $lotes, $lots['libre'], [
            ['yaw' => 10, 'pitch' => -18],
            ['yaw' => 38, 'pitch' => -18],
            ['yaw' => 38, 'pitch' => 4],
            ['yaw' => 10, 'pitch' => 4],
        ], [
            'color' => '#ecfdf5',
            'background_color' => '#065f46',
            'border_color' => '#10b981',
            'font' => 'exo2bold',
            'size' => 1.1,
            'shape' => 'pill',
        ]);
        $this->lotPolygon($tour, $lotes, $lots['reservado'], [
            ['yaw' => 46, 'pitch' => -18],
            ['yaw' => 74, 'pitch' => -18],
            ['yaw' => 74, 'pitch' => 4],
            ['yaw' => 46, 'pitch' => 4],
        ], [
            'color' => '#fffbeb',
            'background_color' => '#92400e',
            'border_color' => '#f59e0b',
            'font' => 'kelsonsans',
            'rotation' => -8,
            'shape' => 'tag',
            'visibility' => 'click',
        ]);
        $this->lotPolygon($tour, $lotes, $lots['transferido'], [
            ['yaw' => 82, 'pitch' => -18],
            ['yaw' => 110, 'pitch' => -18],
            ['yaw' => 110, 'pitch' => 4],
            ['yaw' => 82, 'pitch' => 4],
        ]);

        Project360Polygon::query()->updateOrCreate(
            [
                'project_360_tour_id' => $tour->id,
                'title' => '[Seed] Zona de reuniones',
            ],
            [
                'source_panorama_id' => $social->id,
                'lot_id' => null,
                'description' => 'Área común de demostración (sin lote ligado).',
                'vertices' => [
                    ['yaw' => -40, 'pitch' => -16],
                    ['yaw' => 10, 'pitch' => -16],
                    ['yaw' => 10, 'pitch' => 8],
                    ['yaw' => -40, 'pitch' => 8],
                ],
                'color' => '#38bdf8',
                'hover_color' => '#7dd3fc',
                'opacity' => 0.28,
                'label_text' => 'Reuniones',
                'label_color' => '#e0f2fe',
                'label_background_color' => '#0c4a6e',
                'label_border_color' => '#38bdf8',
                'label_border_width' => 0.04,
                'label_font' => 'sourcecodepro',
                'label_size' => 1.05,
                'label_rotation' => 6,
                'label_shape' => 'rounded',
                'label_visibility' => 'click',
            ],
        );

        $creatorId = User::query()->orderBy('id')->value('id');
        $tour->shareLinks()->firstOrCreate(
            ['label' => self::SHARE_LINK_LABEL],
            [
                'created_by' => $creatorId,
                'revoked_at' => null,
            ],
        );

        if (Schema::hasTable('project_360_labels')) {
            $this->label($tour, $entrada, 'Bienvenidos a Tour 360 Demo', 0.0, 12.0, '#ffffff', 1.2, [
                'font' => 'exo2bold',
                'background_color' => '#111827',
                'border_color' => '#38bdf8',
                'shape' => 'pill',
                'rotation' => -4,
            ]);
            $this->label($tour, $lotes, 'Lotes de la manzana A', 40.0, 10.0, '#fef08a', 1.15, [
                'font' => 'kelsonsans',
                'background_color' => '#1e293b',
                'border_color' => '#facc15',
                'shape' => 'tag',
                'visibility' => 'click',
                'rotation' => 8,
            ]);
        }

        app(Project360TourService::class)->syncTour360Url($project);
    }

    private function seedSinglePanorama(Project $project, string $title, string $fixture): void
    {
        $panorama = $this->panorama($project, $title, 1, $fixture);

        Project360Tour::query()->updateOrCreate(
            ['project_id' => $project->id],
            [
                ...Project360TourService::defaultTheme(),
                'start_panorama_id' => $panorama->id,
            ],
        );

        app(Project360TourService::class)->syncTour360Url($project);
    }

    private function panorama(Project $project, string $title, int $sortOrder, string $fixture): ProjectAsset
    {
        $contents = $this->fixtureContents($fixture);
        $fileName = sprintf('panorama_%d_%d.jpg', $project->id, $sortOrder);
        $relativePath = sprintf('projects/%d/panoramas/%s', $project->id, $fileName);

        $this->deleteStalePanoramaFile($project, $sortOrder);
        $this->storePanoramaFile($relativePath, $contents);

        $attributes = [
            'kind' => ProjectAsset::KIND_PANORAMA,
            'title' => $title,
            'file_name' => $fileName,
            'file_path' => $relativePath,
            'mime_type' => 'image/jpeg',
            'file_size' => strlen($contents),
            'sort_order' => $sortOrder,
            'is_active' => true,
        ];

        $existing = $project->assets()
            ->where('kind', ProjectAsset::KIND_PANORAMA)
            ->where('title', $title)
            ->first();

        if ($existing !== null) {
            $existing->update($attributes);

            return $existing->refresh();
        }

        return $project->assets()->create($attributes);
    }

    private function fixtureContents(string $fileName): string
    {
        $path = database_path('seeders/data/project-360/'.$fileName);

        if (! is_file($path)) {
            throw new \RuntimeException("Project360Seeder: falta el panorama {$fileName} en database/seeders/data/project-360.");
        }

        $contents = file_get_contents($path);

        if ($contents === false || $contents === '') {
            throw new \RuntimeException("Project360Seeder: no se pudo leer {$fileName}.");
        }

        return $contents;
    }

    private function deleteStalePanoramaFile(Project $project, int $sortOrder): void
    {
        foreach (['jpg', 'png'] as $extension) {
            $relative = sprintf('projects/%d/panoramas/panorama_%d_%d.%s', $project->id, $project->id, $sortOrder, $extension);
            Storage::disk('public')->delete($relative);

            try {
                FileStorage::deleteIfExists($relative);
            } catch (\Throwable) {
                // Disco remoto mal configurado.
            }
        }
    }

    private function storePanoramaFile(string $filePath, string $contents): void
    {
        Storage::disk('public')->put($filePath, $contents);

        $configuredDisk = ProjectAsset::storageDisk();
        if ($configuredDisk === 'public') {
            return;
        }

        try {
            Storage::disk($configuredDisk)->put($filePath, $contents);
        } catch (\Throwable) {
            // El visor local usará el disco public vía storage:link.
        }
    }

    /**
     * @param  array<string, mixed>  $style
     */
    private function hotspot(
        Project360Tour $tour,
        ProjectAsset $source,
        ProjectAsset $target,
        string $label,
        float $yaw,
        float $pitch,
        array $style = [],
    ): void {
        Project360Hotspot::query()->updateOrCreate(
            [
                'project_360_tour_id' => $tour->id,
                'source_panorama_id' => $source->id,
                'target_panorama_id' => $target->id,
                'label' => $label,
            ],
            [
                'yaw' => $yaw,
                'pitch' => $pitch,
                'color' => $style['color'] ?? null,
                'shape' => $style['shape'] ?? null,
                'hover_color' => $style['hover_color'] ?? null,
                'text_color' => $style['text_color'] ?? null,
                'size' => $style['size'] ?? null,
                'label_visibility' => $style['label_visibility'] ?? null,
                'pulse_enabled' => $style['pulse_enabled'] ?? null,
            ],
        );
    }

    private function label(
        Project360Tour $tour,
        ProjectAsset $source,
        string $text,
        float $yaw,
        float $pitch,
        string $color = '#ffffff',
        float $size = 1.0,
        array $style = [],
    ): void {
        Project360Label::query()->updateOrCreate(
            [
                'project_360_tour_id' => $tour->id,
                'source_panorama_id' => $source->id,
                'text' => $text,
            ],
            [
                'yaw' => $yaw,
                'pitch' => $pitch,
                'color' => $color,
                'background_color' => $style['background_color'] ?? '#0f172a',
                'border_color' => $style['border_color'] ?? '#334155',
                'border_width' => $style['border_width'] ?? 0.03,
                'font' => $style['font'] ?? 'roboto',
                'size' => $size,
                'width' => $style['width'] ?? 1.2,
                'height' => $style['height'] ?? 0.34,
                'rotation' => $style['rotation'] ?? 0,
                'shape' => $style['shape'] ?? 'rounded',
                'visibility' => $style['visibility'] ?? 'always',
            ],
        );
    }

    /**
     * @param  list<array{yaw: float|int, pitch: float|int}>  $vertices
     * @param  array<string, mixed>  $label
     */
    private function lotPolygon(
        Project360Tour $tour,
        ProjectAsset $source,
        Lot $lot,
        array $vertices,
        array $label = [],
    ): void {
        Project360Polygon::query()->updateOrCreate(
            [
                'project_360_tour_id' => $tour->id,
                'lot_id' => $lot->id,
            ],
            [
                'source_panorama_id' => $source->id,
                'title' => 'Lote '.$lot->number,
                'description' => 'Polígono de demostración ligado al lote '.$lot->block.'-'.$lot->number.'.',
                'vertices' => $vertices,
                'color' => $lot->status?->color ?: '#f97316',
                'hover_color' => '#fb923c',
                'opacity' => 0.32,
                'label_text' => (string) $lot->number,
                'label_color' => $label['color'] ?? '#ffffff',
                'label_background_color' => $label['background_color'] ?? '#0f172a',
                'label_border_color' => $label['border_color'] ?? '#334155',
                'label_border_width' => $label['border_width'] ?? 0.03,
                'label_font' => $label['font'] ?? 'roboto',
                'label_size' => $label['size'] ?? 1.0,
                'label_width' => $label['width'] ?? 1.2,
                'label_height' => $label['height'] ?? 0.34,
                'label_rotation' => $label['rotation'] ?? 0,
                'label_shape' => $label['shape'] ?? 'rounded',
                'label_visibility' => $label['visibility'] ?? 'always',
                'label_yaw' => $label['yaw'] ?? null,
                'label_pitch' => $label['pitch'] ?? null,
            ],
        );
    }
}
