<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Support\FileStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class Project360TourService
{
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
     * @return array{start_panorama_id: int|null, panoramas: list<array<string, mixed>>, hotspots: list<array<string, mixed>>}
     */
    public function payload(Project $project, callable $urlResolver): array
    {
        $tour = $project->tour360()->first();
        $panoramas = $project->panoramas()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
        $hotspots = $tour
            ? $tour->hotspots()->orderBy('id')->get()
            : collect();
        $startPanoramaId = $tour?->start_panorama_id;

        if ($startPanoramaId === null || ! $panoramas->contains('id', $startPanoramaId)) {
            $startPanoramaId = $panoramas->first()?->id;
        }

        return [
            'start_panorama_id' => $startPanoramaId,
            'panoramas' => $panoramas->map(fn (ProjectAsset $panorama): array => [
                'id' => $panorama->id,
                'title' => $panorama->title ?: $panorama->file_name,
                'sort_order' => $panorama->sort_order,
                'viewer_url' => $urlResolver($panorama),
                'is_starting' => $startPanoramaId === $panorama->id,
            ])->values()->all(),
            'hotspots' => $hotspots->map(fn (Project360Hotspot $hotspot): array => [
                'id' => $hotspot->id,
                'source_panorama_id' => $hotspot->source_panorama_id,
                'target_panorama_id' => $hotspot->target_panorama_id,
                'label' => $hotspot->label,
                'yaw' => (float) $hotspot->yaw,
                'pitch' => (float) $hotspot->pitch,
            ])->values()->all(),
        ];
    }
}
