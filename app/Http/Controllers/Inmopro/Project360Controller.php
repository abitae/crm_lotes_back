<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\Project360ShareService;
use App\Services\Inmopro\Project360TourService;
use App\Support\FileStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class Project360Controller extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
        private Project360ShareService $shareService,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $status = (string) $request->string('status');

        $projects = Project::query()
            ->withCount([
                'panoramas as panoramas_count' => fn (Builder $query) => $query->where('is_active', true),
            ])
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
                'panoramas_count' => $project->panoramas_count ?? 0,
            ]);

        return Inertia::render('inmopro/project-360/index', [
            'projects' => $projects,
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
            ],
            'canManage' => $request->user()?->can('inmopro.project-360.manage') ?? false,
        ]);
    }

    public function show(Request $request, Project $project): Response
    {
        $tourPayload = $this->tourService->payload(
            $project,
            fn (ProjectAsset $panorama): ?string => FileStorage::url($panorama->file_path),
        );
        $tour = $project->tour360()->first();
        $canManage = $request->user()?->can('inmopro.project-360.manage') ?? false;
        $shareLinks = $canManage && $tour
            ? $tour->shareLinks()
                ->with('creator')
                ->latest()
                ->get()
                ->map(fn (Project360ShareLink $shareLink): array => $this->shareService->payload($shareLink))
                ->values()
                ->all()
            : [];

        return Inertia::render('inmopro/project-360/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'is_active' => (bool) $project->is_active,
            ],
            'tour' => [
                ...$tourPayload,
                'share_links' => $shareLinks,
            ],
            'canManage' => $canManage,
        ]);
    }
}
