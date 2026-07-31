<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProject360HotspotRequest;
use App\Http\Requests\Inmopro\UpdateProject360HotspotRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Hotspot;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;

class Project360HotspotController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function store(StoreProject360HotspotRequest $request, Project $project): RedirectResponse
    {
        $validated = $request->validated();
        $this->tourService->hotspotPanoramas($project, $validated);
        $tour = $this->tourService->tourForProject($project);

        $tour->hotspots()->create($validated);

        return back()->with('success', 'Hotspot añadido correctamente.');
    }

    public function update(
        UpdateProject360HotspotRequest $request,
        Project $project,
        Project360Hotspot $hotspot,
    ): RedirectResponse {
        $this->tourService->ensureHotspotForProject($project, $hotspot);
        $validated = $request->validated();
        $this->tourService->hotspotPanoramas($project, $validated);
        $hotspot->update($validated);

        return back()->with('success', 'Hotspot actualizado correctamente.');
    }

    public function destroy(Project $project, Project360Hotspot $hotspot): RedirectResponse
    {
        $this->tourService->ensureHotspotForProject($project, $hotspot);
        $hotspot->delete();

        return back()->with('success', 'Hotspot eliminado correctamente.');
    }
}
