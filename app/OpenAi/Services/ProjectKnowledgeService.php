<?php

namespace App\OpenAi\Services;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\ProjectLocationMapsResolver;
use Illuminate\Database\Eloquent\Collection;

class ProjectKnowledgeService
{
    public function __construct(
        private ProjectLocationMapsResolver $locationMapsResolver,
    ) {}

    /**
     * @return Collection<int, Project>
     */
    public function listActiveProjects(): Collection
    {
        return Project::query()
            ->active()
            ->withCount('lots')
            ->withCount([
                'assets as images_count' => fn ($query) => $query->where('kind', 'image')->where('is_active', true),
                'assets as documents_count' => fn ($query) => $query->where('kind', 'document')->where('is_active', true),
            ])
            ->orderBy('name')
            ->get();
    }

    public function getActiveProject(int $projectId): Project
    {
        $project = Project::query()
            ->active()
            ->withCount([
                'lots',
                'assets as images_count' => fn ($query) => $query->where('kind', 'image')->where('is_active', true),
                'assets as documents_count' => fn ($query) => $query->where('kind', 'document')->where('is_active', true),
            ])
            ->with(['assets' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')->orderBy('id')])
            ->find($projectId);

        abort_if($project === null, 404);

        return $project;
    }

    /**
     * @return Collection<int, Lot>
     */
    public function searchAvailableLots(?int $projectId = null, ?string $search = null, bool $availableOnly = true): Collection
    {
        return Lot::query()
            ->with(['project', 'status'])
            ->whereHas('project', fn ($query) => $query->active())
            ->when($projectId !== null, fn ($query) => $query->where('project_id', $projectId))
            ->when($search !== null && trim($search) !== '', function ($query) use ($search) {
                $term = trim($search);
                $query->where(function ($nestedQuery) use ($term) {
                    $nestedQuery->where('block', 'like', "%{$term}%")
                        ->orWhere('number', 'like', "%{$term}%");
                });
            })
            ->when($availableOnly, function ($query) {
                $query->whereHas('status', fn ($statusQuery) => $statusQuery->where('code', 'LIBRE'));
            })
            ->orderBy('project_id')
            ->orderBy('block')
            ->orderBy('number')
            ->get();
    }

    public function getAvailableLot(int $lotId, bool $availableOnly = true): Lot
    {
        $lot = Lot::query()
            ->with(['project', 'status'])
            ->whereHas('project', fn ($query) => $query->active())
            ->when($availableOnly, function ($query) {
                $query->whereHas('status', fn ($statusQuery) => $statusQuery->where('code', 'LIBRE'));
            })
            ->find($lotId);

        abort_if($lot === null, 404);

        return $lot;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listActiveProjectsPayload(): array
    {
        return $this->listActiveProjects()
            ->map(fn (Project $project) => $this->projectSummaryPayload($project))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function activeProjectDetailPayload(int $projectId): array
    {
        return $this->projectDetailPayload($this->getActiveProject($projectId));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function searchLotsPayload(?int $projectId = null, ?string $search = null, bool $availableOnly = true): array
    {
        return $this->searchAvailableLots($projectId, $search, $availableOnly)
            ->map(fn (Lot $lot) => $this->lotPayload($lot))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function lotDetailPayload(int $lotId, bool $availableOnly = true): array
    {
        return $this->lotPayload($this->getAvailableLot($lotId, $availableOnly));
    }

    /**
     * @return array<string, mixed>
     */
    public function projectSummaryPayload(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'location' => $project->location,
            'maps_url' => $this->mapsUrlForLocation($project->location),
            'total_lots' => $project->total_lots,
            'lots_count' => $project->lots_count,
            'images_count' => $project->images_count ?? null,
            'documents_count' => $project->documents_count ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function projectDetailPayload(Project $project): array
    {
        $assets = $project->assets ?? collect();

        return [
            ...$this->projectSummaryPayload($project),
            'blocks' => $project->blocks,
            'assets' => $assets->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))->values()->all(),
            'images' => $assets->where('kind', 'image')->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))->values()->all(),
            'documents' => $assets->where('kind', 'document')->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function lotPayload(Lot $lot): array
    {
        return [
            'id' => $lot->id,
            'block' => $lot->block,
            'number' => $lot->number,
            'area' => $lot->area,
            'price' => $lot->price,
            'project' => $lot->project ? [
                'id' => $lot->project->id,
                'name' => $lot->project->name,
                'location' => $lot->project->location,
                'maps_url' => $this->mapsUrlForLocation($lot->project->location),
            ] : null,
            'status' => $lot->status ? [
                'id' => $lot->status->id,
                'name' => $lot->status->name,
                'code' => $lot->status->code,
            ] : null,
            'can_pre_reserve' => $lot->status?->code === 'LIBRE',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function assetPayload(Project $project, ProjectAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'kind' => $asset->kind,
            'title' => $asset->title,
            'file_name' => $asset->file_name,
            'mime_type' => $asset->mime_type,
            'file_size' => $asset->file_size,
            'download_url' => route('api.v1.cazador.projects.assets.download', [$project, $asset], absolute: true),
        ];
    }

    /**
     * @param  array<mixed>  $data
     */
    public function encodeForTool(array $data): string
    {
        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    public function mapsUrlForLocation(?string $location): ?string
    {
        return $this->locationMapsResolver->resolveMapsUrl($location);
    }
}
