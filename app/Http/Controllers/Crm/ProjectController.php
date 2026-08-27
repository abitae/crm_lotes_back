<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Project;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->where('is_active', true)
            ->withCount('lots')
            ->withCount(['lots as available_lots_count' => fn ($query) => $query->whereHas('status', fn ($statusQuery) => $statusQuery->where('code', 'LIBRE'))])
            ->orderBy('name')
            ->get(['id', 'name', 'location', 'total_lots']);

        return Inertia::render('crm/projects/index', [
            'projects' => $projects,
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
}
