<?php

namespace App\Http\Controllers\Api\v1\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Web\IndexWebProjectsRequest;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\ProjectLocationMapsResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WebController extends Controller
{
    public function __construct(
        private ProjectLocationMapsResolver $locationMapsResolver,
    ) {}

    /**
     * Catálogo público de proyectos por sitio web (`tipo_web` obligatorio en query).
     */
    public function index(IndexWebProjectsRequest $request): JsonResponse
    {
        $tipoWeb = $request->tipoWeb();

        $paginator = $this->applyIndexFilters(
            $this->baseProjectQuery($tipoWeb),
            $request
        )
            ->paginate($request->perPage())
            ->withQueryString();

        return response()->json([
            'summary' => $this->summaryPayload($tipoWeb),
            'meta' => [
                ...$this->paginationMeta($paginator),
                'tipo_web' => $tipoWeb,
            ],
            'data' => $paginator->getCollection()
                ->map(fn (Project $project) => $this->projectPayload($project))
                ->values()
                ->all(),
        ]);
    }

    /**
     * Detalle de un proyecto (misma forma que cada elemento en el listado).
     */
    public function show(Request $request, Project $project): JsonResponse
    {
        $this->abortUnlessVisibleOnWeb($project);

        if ($request->filled('tipo_web')) {
            $request->validate([
                'tipo_web' => ['string', Rule::in(Project::TIPO_WEB_SITES)],
            ]);

            abort_unless($project->tipo_web === $request->query('tipo_web'), 404);
        }

        $this->loadProjectRelationsForPayload($project);

        return response()->json([
            'data' => $this->projectPayload($project),
        ]);
    }

    /**
     * Redirige al archivo en disco público ({APP_URL}/storage/...).
     */
    public function asset(Project $project, ProjectAsset $asset): RedirectResponse|StreamedResponse
    {
        $this->abortUnlessVisibleOnWeb($project);
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

    private function abortUnlessVisibleOnWeb(Project $project): void
    {
        abort_unless($project->is_active && $project->is_web, 404);
    }

    /**
     * @return Builder<Project>
     */
    private function baseProjectQuery(string $tipoWeb): Builder
    {
        return Project::query()
            ->visibleOnWeb()
            ->where('tipo_web', $tipoWeb)
            ->with(['projectType', 'city'])
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
                ->where(function (Builder $assetQuery): void {
                    $this->applyImageAssetScope($assetQuery);
                }));
        }

        if (filter_var($validated['has_videos'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereHas('assets', fn (Builder $b) => $b
                ->where('is_active', true)
                ->where(function (Builder $assetQuery): void {
                    $this->applyVideoAssetScope($assetQuery);
                }));
        }

        return match ($validated['order'] ?? 'name') {
            'name_desc' => $query->orderByDesc('name'),
            'lots_desc' => $query->orderByDesc('lots_count')->orderBy('name'),
            'free_lots_desc' => $query->orderByDesc('free_lots_count')->orderBy('name'),
            default => $query->orderBy('name'),
        };
    }

    private function loadProjectRelationsForPayload(Project $project): void
    {
        $project->load(['projectType', 'city']);
        $project->load(['assets' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('id')]);
        $project->loadCount('lots');
        $project->loadCount([
            'lots as free_lots_count' => fn (Builder $b) => $b->whereHas(
                'status',
                fn (Builder $s) => $s->where('code', LotStatus::CODE_LIBRE)
            ),
        ]);
    }

    /**
     * @param  Builder<ProjectAsset>  $query
     */
    private function applyImageAssetScope(Builder $query): void
    {
        $query->where(function (Builder $inner): void {
            $inner->where('kind', 'image')
                ->orWhere('mime_type', 'like', 'image/%');
        });
    }

    /**
     * @param  Builder<ProjectAsset>  $query
     */
    private function applyVideoAssetScope(Builder $query): void
    {
        $query->where(function (Builder $inner): void {
            $inner->where('kind', 'video')
                ->orWhere('mime_type', 'like', 'video/%');
        });
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
    private function summaryPayload(string $tipoWeb): array
    {
        $visibleProjectIds = Project::query()
            ->visibleOnWeb()
            ->where('tipo_web', $tipoWeb)
            ->pluck('id');

        if ($visibleProjectIds->isEmpty()) {
            return [
                'projects_count' => 0,
                'lots_total' => 0,
                'lots_free' => 0,
                'images_total' => 0,
                'videos_total' => 0,
            ];
        }

        $lotsQuery = Lot::query()->whereIn('project_id', $visibleProjectIds);

        $lotsTotal = (clone $lotsQuery)->count();
        $lotsFree = (clone $lotsQuery)
            ->whereHas('status', fn (Builder $s) => $s->where('code', LotStatus::CODE_LIBRE))
            ->count();

        $assetsQuery = ProjectAsset::query()
            ->whereIn('project_id', $visibleProjectIds)
            ->where('is_active', true);

        $imagesTotal = (clone $assetsQuery)
            ->where(function (Builder $q): void {
                $this->applyImageAssetScope($q);
            })
            ->count();

        $videosTotal = (clone $assetsQuery)
            ->where(function (Builder $q): void {
                $this->applyVideoAssetScope($q);
            })
            ->count();

        return [
            'projects_count' => $visibleProjectIds->count(),
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
            'maps_url' => $this->locationMapsResolver->resolveMapsUrl($project->location),
            'location_label' => $this->locationMapsResolver->displayLabel($project->location),
            'blocks' => $project->blocks,
            'total_lots' => $project->total_lots,
            'lots_count' => $project->lots_count,
            'free_lots_count' => $project->free_lots_count ?? 0,
            'project_type' => $project->projectType ? [
                'id' => $project->projectType->id,
                'name' => $project->projectType->name,
                'code' => $project->projectType->code,
            ] : null,
            'image_portada' => $project->image_portada,
            'tipo_web' => $project->tipo_web,
            'city' => $project->city ? [
                'id' => $project->city->id,
                'name' => $project->city->name,
                'department' => $project->city->department,
            ] : null,
            'province' => $project->province,
            'district' => $project->district,
            'project_zone' => $project->project_zone,
            'registry_status' => $project->registry_status,
            'descripcion' => $project->descripcion,
            'precio_web' => $project->precio_web !== null ? (float) $project->precio_web : null,
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
