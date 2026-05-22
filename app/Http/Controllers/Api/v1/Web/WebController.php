<?php

namespace App\Http\Controllers\Api\v1\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Web\IndexWebProjectsRequest;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WebController extends Controller
{
    /**
     * Catálogo público de proyectos: totales globales, lotes y activos (imágenes / vídeos).
     */
    public function index(IndexWebProjectsRequest $request): JsonResponse
    {
        $paginator = $this->applyIndexFilters(
            $this->baseProjectQuery(),
            $request
        )
            ->paginate($request->perPage())
            ->withQueryString();

        return response()->json([
            'summary' => $this->summaryPayload(),
            'meta' => $this->paginationMeta($paginator),
            'data' => $paginator->getCollection()
                ->map(fn (Project $project) => $this->projectPayload($project))
                ->values()
                ->all(),
        ]);
    }

    /**
     * Detalle de un proyecto (misma forma que cada elemento en el listado).
     */
    public function show(Project $project): JsonResponse
    {
        $project->load(['projectType']);
        $project->load(['assets' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('id')]);
        $project->loadCount('lots');
        $project->loadCount([
            'lots as free_lots_count' => fn (Builder $b) => $b->whereHas(
                'status',
                fn (Builder $s) => $s->where('code', LotStatus::CODE_LIBRE)
            ),
        ]);

        return response()->json([
            'data' => $this->projectPayload($project),
        ]);
    }

    /**
     * Redirige al archivo en disco público ({APP_URL}/storage/...).
     * Compatibilidad: misma ruta que el campo `url` cuando se usaba proxy por API.
     */
    public function asset(Project $project, ProjectAsset $asset): RedirectResponse|StreamedResponse
    {
        abort_unless($asset->project_id === $project->id && $asset->is_active, 404);

        $disk = Storage::disk(ProjectAsset::storageDisk());

        if (! $disk->exists($asset->file_path)) {
            abort(404);
        }

        $publicUrl = $disk->url($asset->file_path);

        if ($publicUrl !== '') {
            return redirect($publicUrl);
        }

        return $disk->response($asset->file_path, $asset->file_name, [
            'Content-Type' => $asset->mime_type ?: 'application/octet-stream',
        ]);
    }

    /**
     * @return Builder<Project>
     */
    private function baseProjectQuery(): Builder
    {
        return Project::query()
            ->where('is_active', true)
            ->with(['projectType'])
            ->with(['assets' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('id')])
            ->withCount('lots')
            ->withCount([
                'lots as free_lots_count' => fn (Builder $b) => $b->whereHas(
                    'status',
                    fn (Builder $s) => $s->where('code', LotStatus::CODE_LIBRE)
                ),
            ]);
    }

    /**
     * @param  Builder<Project>  $query
     * @return Builder<Project>
     */
    private function applyIndexFilters(Builder $query, IndexWebProjectsRequest $request): Builder
    {
        $validated = $request->validated();

        if (! empty($validated['search'])) {
            $term = trim((string) $validated['search']);
            $query->where(function (Builder $builder) use ($term): void {
                $builder->where('name', 'like', "%{$term}%")
                    ->orWhere('location', 'like', "%{$term}%");
            });
        }

        if (! empty($validated['location'])) {
            $query->where('location', (string) $validated['location']);
        }

        if (! empty($validated['project_type_id'])) {
            $query->where('project_type_id', (int) $validated['project_type_id']);
        }

        if (filter_var($validated['has_free_lots'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereHas('lots', fn (Builder $b) => $b->whereHas(
                'status',
                fn (Builder $s) => $s->where('code', LotStatus::CODE_LIBRE)
            ));
        }

        if (filter_var($validated['has_images'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereHas('assets', fn (Builder $b) => $b
                ->where('is_active', true)
                ->where(fn (Builder $assetQuery) => $this->applyImageAssetScope($assetQuery)));
        }

        if (filter_var($validated['has_videos'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereHas('assets', fn (Builder $b) => $b
                ->where('is_active', true)
                ->where(fn (Builder $assetQuery) => $this->applyVideoAssetScope($assetQuery)));
        }

        return match ($validated['order'] ?? 'name') {
            'name_desc' => $query->orderByDesc('name'),
            'lots_desc' => $query->orderByDesc('lots_count')->orderBy('name'),
            'free_lots_desc' => $query->orderByDesc('free_lots_count')->orderBy('name'),
            default => $query->orderBy('name'),
        };
    }

    /**
     * @param  Builder<ProjectAsset>  $query
     */
    private function applyImageAssetScope(Builder $query): void
    {
        $query->where('kind', 'image')
            ->orWhere('mime_type', 'like', 'image/%');
    }

    /**
     * @param  Builder<ProjectAsset>  $query
     */
    private function applyVideoAssetScope(Builder $query): void
    {
        $query->where('kind', 'video')
            ->orWhere('mime_type', 'like', 'video/%');
    }

    /**
     * @return array<string, int|null>
     */
    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function summaryPayload(): array
    {
        $lotsTotal = Lot::query()->count();
        $lotsFree = Lot::query()
            ->whereHas('status', fn (Builder $s) => $s->where('code', LotStatus::CODE_LIBRE))
            ->count();

        $imagesTotal = ProjectAsset::query()
            ->where('is_active', true)
            ->where(function (Builder $q): void {
                $this->applyImageAssetScope($q);
            })
            ->count();

        $videosTotal = ProjectAsset::query()
            ->where('is_active', true)
            ->where(function (Builder $q): void {
                $this->applyVideoAssetScope($q);
            })
            ->count();

        return [
            'projects_count' => Project::query()->count(),
            'lots_total' => $lotsTotal,
            'lots_free' => $lotsFree,
            'images_total' => $imagesTotal,
            'videos_total' => $videosTotal,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function projectPayload(Project $project): array
    {
        $assets = $project->relationLoaded('assets') ? $project->assets : collect();

        $images = $assets->filter(fn (ProjectAsset $a) => $this->assetIsImage($a))->values();
        $videos = $assets->filter(fn (ProjectAsset $a) => $this->assetIsVideo($a))->values();

        return [
            'id' => $project->id,
            'name' => $project->name,
            'location' => $project->location,
            'blocks' => $project->blocks,
            'total_lots' => $project->total_lots,
            'lots_count' => $project->lots_count,
            'free_lots_count' => $project->free_lots_count ?? 0,
            'project_type' => $project->projectType ? [
                'id' => $project->projectType->id,
                'name' => $project->projectType->name,
                'code' => $project->projectType->code,
            ] : null,
            'images' => $images->map(fn (ProjectAsset $a) => $this->assetPayload($a))->all(),
            'videos' => $videos->map(fn (ProjectAsset $a) => $this->assetPayload($a))->all(),
            'images_count' => $images->count(),
            'videos_count' => $videos->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function assetPayload(ProjectAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'kind' => $asset->kind,
            'title' => $asset->title,
            'file_name' => $asset->file_name,
            'mime_type' => $asset->mime_type,
            'file_size' => $asset->file_size,
            'url' => Storage::disk(ProjectAsset::storageDisk())->url($asset->file_path),
        ];
    }

    private function assetIsImage(ProjectAsset $asset): bool
    {
        if ($asset->kind === 'image') {
            return true;
        }

        $mime = (string) $asset->mime_type;

        return str_starts_with($mime, 'image/');
    }

    private function assetIsVideo(ProjectAsset $asset): bool
    {
        if ($asset->kind === 'video') {
            return true;
        }

        $mime = (string) $asset->mime_type;

        return str_starts_with($mime, 'video/');
    }
}
