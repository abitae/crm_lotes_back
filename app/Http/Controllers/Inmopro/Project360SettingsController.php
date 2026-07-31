<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\UpdateProject360SceneSettingsRequest;
use App\Http\Requests\Inmopro\UpdateProject360TourSettingsRequest;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;

class Project360SettingsController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function tour(UpdateProject360TourSettingsRequest $request, Project $project): RedirectResponse
    {
        $this->tourService->updateTourSettings($project, $request->validated());

        return back()->with('success', 'Tema del tour actualizado correctamente.');
    }

    public function scene(UpdateProject360SceneSettingsRequest $request, Project $project): RedirectResponse
    {
        $this->tourService->updateSceneSettings($project, $request->validated());

        return back()->with('success', 'Configuración de la escena actualizada correctamente.');
    }
}
