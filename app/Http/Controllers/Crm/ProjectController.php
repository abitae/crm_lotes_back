<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Cazador\ProjectAssetShareService;
use App\Services\Inmopro\ProjectFlatViewService;
use App\Services\Inmopro\ProjectLocationMapsResolver;
use App\Support\FileStorage;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectController extends Controller
{
    public function __construct(
        private ProjectLocationMapsResolver $locationResolver,
        private ProjectAssetShareService $assetShareService,
        private ProjectFlatViewService $flatViewService,
    ) {}

    public function index(): Response
    {
        $projects = Project::query()
            ->where('is_active', true)
            ->with([
                'city:id,name',
                'documents' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('id'),
            ])
            ->withCount('lots')
            ->withCount([
                'lots as available_lots_count' => fn (Builder $query) => $query->whereHas(
                    'status',
                    fn (Builder $statusQuery) => $statusQuery->where('code', 'LIBRE'),
                ),
                'flatPolygons',
            ])
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'location',
                'total_lots',
                'tour_360_url',
                'image_portada',
                'city_id',
                'district',
            ]);

        return Inertia::render('crm/projects/index', [
            'projects' => $projects->map(fn (Project $project): array => $this->cardPayload($project))->values()->all(),
        ]);
    }

    public function show(Project $project): Response
    {
        abort_unless($project->is_active, 404);

        $lots = $project->lots()
            ->with('status:id,code,name,color')
            ->orderBy('block')
            ->orderBy('number')
            ->get(['id', 'project_id', 'block', 'number', 'area', 'price', 'lot_status_id']);

        return Inertia::render('crm/projects/show', [
            'project' => $project->only(['id', 'name', 'location', 'total_lots']),
            'lots' => $lots,
        ]);
    }

    public function flat(Project $project): Response
    {
        abort_unless($project->is_active, 404);
        abort_unless($project->flatPolygons()->exists(), 404);

        $payload = $this->flatViewService->payload($project);
        $apiKey = config('services.google.maps_api_key');

        return Inertia::render('crm/projects/flat', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'polygons' => $payload['polygons'],
            'mapsCenter' => $payload['maps_center'],
            'googleMapsApiKey' => is_string($apiKey) && trim($apiKey) !== '' ? trim($apiKey) : null,
        ]);
    }

    public function downloadAsset(Project $project, ProjectAsset $asset): StreamedResponse
    {
        abort_unless($project->is_active, 404);
        abort_unless(
            $asset->project_id === $project->id
            && $asset->is_active
            && $asset->kind === 'document',
            404,
        );

        return FileStorage::filesystem()->download($asset->file_path, $asset->file_name);
    }

    /**
     * @return array<string, mixed>
     */
    private function cardPayload(Project $project): array
    {
        $hasFlat = (int) ($project->flat_polygons_count ?? 0) > 0;
        $location = is_string($project->location) ? trim($project->location) : '';
        $mapsUrl = $this->locationResolver->resolveMapsUrl($location !== '' ? $location : null);
        $documents = $project->documents ?? collect();

        return [
            'id' => $project->id,
            'name' => $project->name,
            'place_label' => $this->placeLabel($project),
            'image_url' => FileStorage::url($project->image_portada),
            'total_lots' => $project->total_lots,
            'lots_count' => $project->lots_count,
            'available_lots_count' => $project->available_lots_count,
            'view_360_url' => filled($project->tour_360_url) ? $project->tour_360_url : null,
            'view_flat_url' => $hasFlat ? route('crm.projects.flat', $project) : null,
            'maps_url' => $mapsUrl,
            'maps_embed_url' => $this->locationResolver->resolveEmbedUrl($location !== '' ? $location : null),
            'documents_count' => $documents->count(),
            'documents' => $documents
                ->map(fn (ProjectAsset $asset): array => $this->documentPayload($project, $asset))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function documentPayload(Project $project, ProjectAsset $asset): array
    {
        $share = $this->assetShareService->buildShareLinkPayload($asset);

        return [
            'id' => $asset->id,
            'title' => filled($asset->title) ? $asset->title : $asset->file_name,
            'file_name' => $asset->file_name,
            'mime_type' => $asset->mime_type,
            'file_size' => $asset->file_size,
            'download_url' => route('crm.projects.assets.download', [$project, $asset]),
            'share_url' => $share['share_url'],
        ];
    }

    private function placeLabel(Project $project): ?string
    {
        $city = $project->city?->name;
        if (filled($city)) {
            return $city;
        }

        if (filled($project->district)) {
            return $project->district;
        }

        $location = is_string($project->location) ? trim($project->location) : '';

        if ($location === '') {
            return null;
        }

        if ($this->locationResolver->isGoogleMapsUrl($location) || $this->locationResolver->isCoordinatePair($location)) {
            return null;
        }

        return $location;
    }
}
