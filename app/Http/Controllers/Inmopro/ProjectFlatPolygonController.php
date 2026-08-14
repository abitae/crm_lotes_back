<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProjectFlatPolygonRequest;
use App\Http\Requests\Inmopro\UpdateProjectFlatPolygonRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectFlatPolygon;
use App\Services\Inmopro\ProjectFlatViewService;
use Illuminate\Http\RedirectResponse;

class ProjectFlatPolygonController extends Controller
{
    public function __construct(
        private ProjectFlatViewService $flatViewService,
    ) {}

    public function store(StoreProjectFlatPolygonRequest $request, Project $project): RedirectResponse
    {
        $validated = $request->validated();
        $lot = $this->flatViewService->polygonLot($project, $validated);
        $validated['title'] = $this->flatViewService->polygonTitle($lot, $validated['title'] ?? null);
        $validated['lot_id'] = $lot?->id;
        $project->flatPolygons()->create($validated);

        return back()->with('success', 'Polígono añadido correctamente.');
    }

    public function update(
        UpdateProjectFlatPolygonRequest $request,
        Project $project,
        ProjectFlatPolygon $polygon,
    ): RedirectResponse {
        $this->flatViewService->ensurePolygonForProject($project, $polygon);
        $validated = $request->validated();
        $lot = $this->flatViewService->polygonLot($project, $validated, $polygon);
        $validated['title'] = $this->flatViewService->polygonTitle($lot, $validated['title'] ?? null);
        $validated['lot_id'] = $lot?->id;
        $polygon->update($validated);

        return back()->with('success', 'Polígono actualizado correctamente.');
    }

    public function destroy(Project $project, ProjectFlatPolygon $polygon): RedirectResponse
    {
        $this->flatViewService->ensurePolygonForProject($project, $polygon);
        $polygon->delete();

        return back()->with('success', 'Polígono eliminado correctamente.');
    }
}
