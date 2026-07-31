<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
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

    /**
     * @param  list<UploadedFile>  $files
     * @param  list<string>  $titles
     */
    public function storeFloorPlans(Project $project, array $files, array $titles): void
    {
        $storedPaths = [];

        try {
            DB::transaction(function () use ($project, $files, $titles, &$storedPaths): void {
                $nextSortOrder = ((int) $project->floorPlans()->max('sort_order')) + 1;

                foreach ($files as $index => $file) {
                    $stored = $this->assetStorage->store($project, $file, ProjectAsset::KIND_FLOOR_PLAN);
                    $storedPaths[] = $stored['file_path'];

                    $project->assets()->create([
                        'kind' => ProjectAsset::KIND_FLOOR_PLAN,
                        'title' => trim($titles[$index]),
                        'file_name' => $stored['file_name'],
                        'file_path' => $stored['file_path'],
                        'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                        'file_size' => $file->getSize() ?: 0,
                        'sort_order' => $nextSortOrder++,
                        'is_active' => true,
                    ]);
                }
            });
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                FileStorage::deleteIfExists($path);
            }

            throw $exception;
        }
    }

    /** @param array{title: string, sort_order: int} $data */
    public function updateFloorPlan(Project $project, ProjectAsset $floorPlan, array $data): void
    {
        $this->ensureFloorPlanForProject($project, $floorPlan);
        $floorPlan->update([
            'title' => trim($data['title']),
            'sort_order' => $data['sort_order'],
        ]);
    }

    public function deleteFloorPlan(Project $project, ProjectAsset $floorPlan): void
    {
        $this->ensureFloorPlanForProject($project, $floorPlan);
        $path = $floorPlan->file_path;

        DB::transaction(function () use ($floorPlan): void {
            Project360SceneSetting::query()
                ->where('floor_plan_id', $floorPlan->id)
                ->update([
                    'floor_plan_id' => null,
                    'plan_x' => null,
                    'plan_y' => null,
                ]);
            $floorPlan->delete();
        });

        FileStorage::deleteIfExists($path);
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

    public function ensureFloorPlanForProject(Project $project, ProjectAsset $floorPlan): void
    {
        if ($floorPlan->project_id !== $project->id || $floorPlan->kind !== ProjectAsset::KIND_FLOOR_PLAN) {
            throw ValidationException::withMessages([
                'floor_plan_id' => 'El plano no pertenece al proyecto seleccionado.',
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
        $floorPlanId = filled($data['floor_plan_id'] ?? null)
            ? (int) $data['floor_plan_id']
            : null;

        if ($floorPlanId !== null) {
            $floorPlan = ProjectAsset::query()->findOrFail($floorPlanId);
            $this->ensureFloorPlanForProject($project, $floorPlan);
        }

        return $this->tourForProject($project)->sceneSettings()->updateOrCreate(
            ['panorama_id' => $panorama->id],
            [
                'initial_yaw' => $data['initial_yaw'],
                'initial_pitch' => $data['initial_pitch'],
                'floor_plan_id' => $floorPlanId,
                'plan_x' => $floorPlanId === null ? null : $data['plan_x'],
                'plan_y' => $floorPlanId === null ? null : $data['plan_y'],
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

    /**
     * @param  callable(ProjectAsset): string|null  $urlResolver
     * @param  (callable(ProjectAsset): string|null)|null  $floorPlanUrlResolver
     * @return array<string, mixed>
     */
    public function payload(
        Project $project,
        callable $urlResolver,
        ?callable $floorPlanUrlResolver = null,
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
        $floorPlans = $project->floorPlans()
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
                    'floor_plan_id' => $settings?->floor_plan_id,
                    'plan_x' => $settings?->plan_x,
                    'plan_y' => $settings?->plan_y,
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
            'floor_plans' => $floorPlans->map(function (ProjectAsset $floorPlan) use (
                $floorPlanUrlResolver,
                $sceneSettings,
            ): array {
                $markers = $sceneSettings
                    ->where('floor_plan_id', $floorPlan->id)
                    ->filter(fn (Project360SceneSetting $setting): bool => $setting->plan_x !== null && $setting->plan_y !== null)
                    ->map(fn (Project360SceneSetting $setting): array => [
                        'panorama_id' => $setting->panorama_id,
                        'x' => (float) $setting->plan_x,
                        'y' => (float) $setting->plan_y,
                    ])
                    ->values()
                    ->all();

                return [
                    'id' => $floorPlan->id,
                    'title' => $floorPlan->title ?: $floorPlan->file_name,
                    'sort_order' => $floorPlan->sort_order,
                    'image_url' => $floorPlanUrlResolver
                        ? $floorPlanUrlResolver($floorPlan)
                        : FileStorage::url($floorPlan->file_path),
                    'markers' => $markers,
                ];
            })->values()->all(),
        ];
    }
}
