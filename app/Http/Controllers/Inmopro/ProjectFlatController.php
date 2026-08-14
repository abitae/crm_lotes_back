<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\ProjectFlatViewService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectFlatController extends Controller
{
    public function __construct(
        private ProjectFlatViewService $flatViewService,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $status = (string) $request->string('status');

        $projects = Project::query()
            ->withCount('flatPolygons as polygons_count')
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            }))
            ->when($status === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn (Builder $query) => $query->where('is_active', false))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'location' => $project->location,
                'is_active' => (bool) $project->is_active,
                'polygons_count' => $project->polygons_count ?? 0,
            ]);

        return Inertia::render('inmopro/project-flat/index', [
            'projects' => $projects,
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
            ],
            'canManage' => $request->user()?->can('inmopro.project-flat.manage') ?? false,
        ]);
    }

    public function show(Request $request, Project $project): Response
    {
        $canManage = $request->user()?->can('inmopro.project-flat.manage') ?? false;
        $payload = $this->flatViewService->payload($project);
        $apiKey = config('services.google.maps_api_key');
        $lotOptions = $project->lots()
            ->with('status')
            ->orderBy('block')
            ->orderBy('number')
            ->get()
            ->map(fn (Lot $lot): array => [
                'id' => $lot->id,
                'block' => $lot->block,
                'number' => (string) $lot->number,
                'area' => $lot->area,
                'price' => $lot->price,
                'status' => $lot->status ? [
                    'name' => $lot->status->name,
                    'code' => $lot->status->code,
                    'color' => $lot->status->color ?: '#94a3b8',
                ] : null,
            ])
            ->values()
            ->all();

        return Inertia::render('inmopro/project-flat/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'location' => $project->location,
                'is_active' => (bool) $project->is_active,
            ],
            'polygons' => $payload['polygons'],
            'mapsCenter' => $payload['maps_center'],
            'googleMapsApiKey' => is_string($apiKey) && trim($apiKey) !== '' ? trim($apiKey) : null,
            'canManage' => $canManage,
            'lotOptions' => $lotOptions,
        ]);
    }
}
