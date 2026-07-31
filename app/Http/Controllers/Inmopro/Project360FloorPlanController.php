<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProject360FloorPlansRequest;
use App\Http\Requests\Inmopro\UpdateProject360FloorPlanRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;

class Project360FloorPlanController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function store(StoreProject360FloorPlansRequest $request, Project $project): RedirectResponse
    {
        /** @var list<UploadedFile> $files */
        $files = $request->file('floor_plan_files', []);
        /** @var list<string> $titles */
        $titles = $request->validated('floor_plan_titles');

        $this->tourService->storeFloorPlans($project, $files, $titles);

        return back()->with('success', 'Planos añadidos correctamente.');
    }

    public function update(
        UpdateProject360FloorPlanRequest $request,
        Project $project,
        ProjectAsset $floorPlan,
    ): RedirectResponse {
        /** @var array{title: string, sort_order: int} $validated */
        $validated = $request->validated();
        $this->tourService->updateFloorPlan($project, $floorPlan, $validated);

        return back()->with('success', 'Plano actualizado correctamente.');
    }

    public function destroy(Project $project, ProjectAsset $floorPlan): RedirectResponse
    {
        $this->tourService->deleteFloorPlan($project, $floorPlan);

        return back()->with('success', 'Plano eliminado correctamente.');
    }
}
