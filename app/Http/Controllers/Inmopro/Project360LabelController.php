<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProject360LabelRequest;
use App\Http\Requests\Inmopro\UpdateProject360LabelRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360Label;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;

class Project360LabelController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function store(StoreProject360LabelRequest $request, Project $project): RedirectResponse
    {
        $validated = $request->validated();
        $this->tourService->labelPanorama($project, $validated);
        $validated['text'] = trim((string) $validated['text']);
        $this->tourService->tourForProject($project)->labels()->create($validated);

        return back()->with('success', 'Etiqueta añadida correctamente.');
    }

    public function update(
        UpdateProject360LabelRequest $request,
        Project $project,
        Project360Label $label,
    ): RedirectResponse {
        $this->tourService->ensureLabelForProject($project, $label);
        $validated = $request->validated();
        $this->tourService->labelPanorama($project, $validated);
        $validated['text'] = trim((string) $validated['text']);
        $label->update($validated);

        return back()->with('success', 'Etiqueta actualizada correctamente.');
    }

    public function destroy(Project $project, Project360Label $label): RedirectResponse
    {
        $this->tourService->ensureLabelForProject($project, $label);
        $label->delete();

        return back()->with('success', 'Etiqueta eliminada correctamente.');
    }
}
