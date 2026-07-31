<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
use App\Models\Inmopro\Project360Polygon;
use App\Models\Inmopro\Project360SceneSetting;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Support\FileStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class Project360TourService
{
    /** @return array<string, mixed> */
    public static function defaultTheme(): array
    {
        return [
            'accent_color' => '#f97316',
            'hotspot_color' => '#f97316',
            'hotspot_hover_color' => '#fb923c',
            'hotspot_text_color' => '#ffffff',
            'hotspot_size' => 0.16,
            'hotspot_shape' => 'sphere',
            'hotspot_label_visibility' => 'always',
            'hotspot_pulse_enabled' => true,
        ];
    }

    public function __construct(
        private ProjectAssetStorageService $assetStorage,
    ) {}

    public function tourForProject(Project $project): Project360Tour
    {
        return $project->tour360()->firstOrCreate();
    }

    /**
     * @param  list<UploadedFile>  $files
     * @param  list<string>  $titles
     */
    public function storePanoramas(Project $project, array $files, array $titles): void
    {
        $storedPaths = [];

        try {
            DB::transaction(function () use ($project, $files, $titles, &$storedPaths): void {
                $tour = $this->tourForProject($project);
                $nextSortOrder = ((int) $project->panoramas()->max('sort_order')) + 1;

                foreach ($files as $index => $file) {
                    $stored = $this->assetStorage->store($project, $file, ProjectAsset::KIND_PANORAMA);
                    $storedPaths[] = $stored['file_path'];

                    $panorama = $project->assets()->create([
                        'kind' => ProjectAsset::KIND_PANORAMA,
                        'title' => trim($titles[$index]),
                        'file_name' => $stored['file_name'],
                        'file_path' => $stored['file_path'],
                        'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                        'file_size' => $file->getSize() ?: 0,
                        'sort_order' => $nextSortOrder++,
                        'is_active' => true,
                    ]);

                    if ($tour->start_panorama_id === null) {
                        $tour->update(['start_panorama_id' => $panorama->id]);
                    }
                }
            });
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                FileStorage::deleteIfExists($path);
            }

            throw $exception;
        }
    }

    public function updatePanorama(Project $project, ProjectAsset $panorama, string $title): void
    {
        $this->ensurePanoramaForProject($project, $panorama);
        $panorama->update(['title' => trim($title)]);
    }

    public function setStartPanorama(Project $project, ProjectAsset $panorama): void
    {
        $this->ensurePanoramaForProject($project, $panorama);

        if (! $panorama->is_active) {
            throw ValidationException::withMessages([
                'panorama_id' => 'El panorama inicial debe estar activo.',
            ]);
        }

        $this->tourForProject($project)->update(['start_panorama_id' => $panorama->id]);
    }

    public function deletePanorama(Project $project, ProjectAsset $panorama): void
    {
        $this->ensurePanoramaForProject($project, $panorama);
        $path = $panorama->file_path;

        DB::transaction(function () use ($project, $panorama): void {
            $tour = $project->tour360()->first();
            $wasStartingPanorama = $tour?->start_panorama_id === $panorama->id;

            $panorama->delete();

            if ($tour && $wasStartingPanorama) {
                $tour->update([
                    'start_panorama_id' => $project->panoramas()
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('id')
                        ->value('id'),
                ]);
            }
        });

        FileStorage::deleteIfExists($path);
    }

    public function ensurePanoramaForProject(Project $project, ProjectAsset $panorama): void
    {
        if ($panorama->project_id !== $project->id || $panorama->kind !== ProjectAsset::KIND_PANORAMA) {
            throw ValidationException::withMessages([
                'panorama_id' => 'El panorama no pertenece al proyecto seleccionado.',
            ]);
        }
    }

    /** @param array<string, mixed> $data */
    public function updateTourSettings(Project $project, array $data): void
    {
        $this->tourForProject($project)->update($data);
    }

    /** @param array<string, mixed> $data */
    public function updateSceneSettings(Project $project, array $data): Project360SceneSetting
    {
        $panorama = ProjectAsset::query()->findOrFail((int) $data['panorama_id']);
        $this->ensurePanoramaForProject($project, $panorama);

        return $this->tourForProject($project)->sceneSettings()->updateOrCreate(
            ['panorama_id' => $panorama->id],
            [
                'initial_yaw' => $data['initial_yaw'],
                'initial_pitch' => $data['initial_pitch'],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: ProjectAsset, 1: ProjectAsset}
     */
    public function hotspotPanoramas(Project $project, array $data): array
    {
        $panoramas = ProjectAsset::query()
            ->where('project_id', $project->id)
            ->where('kind', ProjectAsset::KIND_PANORAMA)
            ->where('is_active', true)
            ->whereIn('id', [
                (int) $data['source_panorama_id'],
                (int) $data['target_panorama_id'],
            ])
            ->get()
            ->keyBy('id');

        $source = $panoramas->get((int) $data['source_panorama_id']);
        $target = $panoramas->get((int) $data['target_panorama_id']);

        if (! $source || ! $target) {
            throw ValidationException::withMessages([
                'target_panorama_id' => 'Los panoramas del hotspot deben estar activos y pertenecer al mismo proyecto.',
            ]);
        }

        return [$source, $target];
    }

    public function ensureHotspotForProject(Project $project, Project360Hotspot $hotspot): void
    {
        $hotspot->loadMissing('tour');

        abort_unless($hotspot->tour?->project_id === $project->id, 404);
    }

    /** @param array<string, mixed> $data */
    public function polygonPanorama(Project $project, array $data): ProjectAsset
    {
        $panorama = ProjectAsset::query()
            ->where('project_id', $project->id)
            ->where('kind', ProjectAsset::KIND_PANORAMA)
            ->where('is_active', true)
            ->find((int) $data['source_panorama_id']);

        if (! $panorama) {
            throw ValidationException::withMessages([
                'source_panorama_id' => 'El panorama del polígono debe estar activo y pertenecer al proyecto.',
            ]);
        }

        return $panorama;
    }

    public function ensurePolygonForProject(Project $project, Project360Polygon $polygon): void
    {
        $polygon->loadMissing('tour');

        abort_unless($polygon->tour?->project_id === $project->id, 404);
    }

    /** @param array<string, mixed> $data */
    public function polygonLot(
        Project $project,
        array $data,
        ?Project360Polygon $currentPolygon = null,
    ): ?Lot {
        $lotId = $data['lot_id'] ?? null;

        if ($lotId === null || $lotId === '') {
            return null;
        }

        $lot = $project->lots()->with('status')->find((int) $lotId);

        if (! $lot) {
            throw ValidationException::withMessages([
                'lot_id' => 'El lote seleccionado no pertenece al proyecto.',
            ]);
        }

        $alreadyLinked = $this->tourForProject($project)
            ->polygons()
            ->where('lot_id', $lot->id)
            ->when(
                $currentPolygon,
                fn ($query) => $query->whereKeyNot($currentPolygon->id),
            )
            ->exists();

        if ($alreadyLinked) {
            throw ValidationException::withMessages([
                'lot_id' => 'Este lote ya está ligado a otro polígono del tour.',
            ]);
        }

        return $lot;
    }

    /**
     * @param  callable(ProjectAsset): string|null  $urlResolver
     * @return array<string, mixed>
     */
    public function payload(
        Project $project,
        callable $urlResolver,
    ): array {
        $tour = $project->tour360()->first();
        $theme = $tour
            ? [
                'accent_color' => $tour->accent_color,
                'hotspot_color' => $tour->hotspot_color,
                'hotspot_hover_color' => $tour->hotspot_hover_color,
                'hotspot_text_color' => $tour->hotspot_text_color,
                'hotspot_size' => (float) $tour->hotspot_size,
                'hotspot_shape' => $tour->hotspot_shape,
                'hotspot_label_visibility' => $tour->hotspot_label_visibility,
                'hotspot_pulse_enabled' => (bool) $tour->hotspot_pulse_enabled,
            ]
            : self::defaultTheme();
        $panoramas = $project->panoramas()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
        $sceneSettings = $tour
            ? $tour->sceneSettings()->get()->keyBy('panorama_id')
            : collect();
        $hotspots = $tour
            ? $tour->hotspots()->orderBy('id')->get()
            : collect();
        $polygons = $tour
            ? $tour->polygons()->with('lot.status')->orderBy('id')->get()
            : collect();
        $startPanoramaId = $tour?->start_panorama_id;

        if ($startPanoramaId === null || ! $panoramas->contains('id', $startPanoramaId)) {
            $startPanoramaId = $panoramas->first()?->id;
        }

        return [
            'start_panorama_id' => $startPanoramaId,
            'settings' => $theme,
            'panoramas' => $panoramas->map(function (ProjectAsset $panorama) use (
                $urlResolver,
                $startPanoramaId,
                $sceneSettings,
            ): array {
                /** @var Project360SceneSetting|null $settings */
                $settings = $sceneSettings->get($panorama->id);

                return [
                    'id' => $panorama->id,
                    'title' => $panorama->title ?: $panorama->file_name,
                    'sort_order' => $panorama->sort_order,
                    'viewer_url' => $urlResolver($panorama),
                    'is_starting' => $startPanoramaId === $panorama->id,
                    'initial_yaw' => $settings?->initial_yaw ?? 0.0,
                    'initial_pitch' => $settings?->initial_pitch ?? 0.0,
                ];
            })->values()->all(),
            'hotspots' => $hotspots->map(fn (Project360Hotspot $hotspot): array => [
                'id' => $hotspot->id,
                'source_panorama_id' => $hotspot->source_panorama_id,
                'target_panorama_id' => $hotspot->target_panorama_id,
                'label' => $hotspot->label,
                'yaw' => (float) $hotspot->yaw,
                'pitch' => (float) $hotspot->pitch,
                'style' => [
                    'color' => $hotspot->color ?? $theme['hotspot_color'],
                    'hover_color' => $hotspot->hover_color ?? $theme['hotspot_hover_color'],
                    'text_color' => $hotspot->text_color ?? $theme['hotspot_text_color'],
                    'size' => (float) ($hotspot->size ?? $theme['hotspot_size']),
                    'shape' => $hotspot->shape ?? $theme['hotspot_shape'],
                    'label_visibility' => $hotspot->label_visibility ?? $theme['hotspot_label_visibility'],
                    'pulse_enabled' => $hotspot->pulse_enabled ?? $theme['hotspot_pulse_enabled'],
                ],
                'overrides' => [
                    'color' => $hotspot->color,
                    'hover_color' => $hotspot->hover_color,
                    'text_color' => $hotspot->text_color,
                    'size' => $hotspot->size,
                    'shape' => $hotspot->shape,
                    'label_visibility' => $hotspot->label_visibility,
                    'pulse_enabled' => $hotspot->pulse_enabled,
                ],
            ])->values()->all(),
            'polygons' => $polygons->map(function (Project360Polygon $polygon): array {
                $lot = $polygon->lot;
                $statusColor = $lot?->status?->color ?: '#94a3b8';

                return [
                    'id' => $polygon->id,
                    'source_panorama_id' => $polygon->source_panorama_id,
                    'lot_id' => $lot?->id,
                    'lot' => $lot ? [
                        'id' => $lot->id,
                        'number' => (string) $lot->number,
                        'status' => $lot->status ? [
                            'name' => $lot->status->name,
                            'code' => $lot->status->code,
                            'color' => $statusColor,
                        ] : null,
                    ] : null,
                    'title' => $lot ? 'Lote '.$lot->number : $polygon->title,
                    'description' => $polygon->description,
                    'vertices' => collect($polygon->vertices)->map(fn (array $vertex): array => [
                        'yaw' => (float) $vertex['yaw'],
                        'pitch' => (float) $vertex['pitch'],
                    ])->values()->all(),
                    'color' => $lot ? $statusColor : $polygon->color,
                    'hover_color' => $lot ? $statusColor : $polygon->hover_color,
                    'opacity' => (float) $polygon->opacity,
                ];
            })->values()->all(),
        ];
    }
}
