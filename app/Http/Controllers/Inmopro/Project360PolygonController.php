<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProject360PolygonRequest;
use App\Http\Requests\Inmopro\UpdateProject360PolygonRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Polygon;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;

class Project360PolygonController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function store(StoreProject360PolygonRequest $request, Project $project): RedirectResponse
    {
        $validated = $request->validated();
        $this->tourService->polygonPanorama($project, $validated);
        $this->tourService->tourForProject($project)->polygons()->create($validated);

        return back()->with('success', 'Polígono añadido correctamente.');
    }

    public function update(
        UpdateProject360PolygonRequest $request,
        Project $project,
        Project360Polygon $polygon,
    ): RedirectResponse {
        $this->tourService->ensurePolygonForProject($project, $polygon);
        $validated = $request->validated();
        $this->tourService->polygonPanorama($project, $validated);
        $polygon->update($validated);

        return back()->with('success', 'Polígono actualizado correctamente.');
    }

    public function destroy(Project $project, Project360Polygon $polygon): RedirectResponse
    {
        $this->tourService->ensurePolygonForProject($project, $polygon);
        $polygon->delete();

        return back()->with('success', 'Polígono eliminado correctamente.');
    }
}
