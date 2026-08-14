<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProject360PanoramasRequest;
use App\Http\Requests\Inmopro\UpdateProject360PanoramaRequest;
use App\Http\Requests\Inmopro\UpdateProject360StartPanoramaRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

class Project360PanoramaController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function file(Project $project, ProjectAsset $panorama): StreamedResponse
    {
        abort_unless(
            $project->is_active
            && $panorama->project_id === $project->id
            && $panorama->kind === ProjectAsset::KIND_PANORAMA
            && $panorama->is_active,
            404,
        );

        return $panorama->streamInline();
    }

    public function store(StoreProject360PanoramasRequest $request, Project $project): RedirectResponse
    {
        /** @var list<UploadedFile> $files */
        $files = $request->file('panorama_files', []);
        /** @var list<string> $titles */
        $titles = $request->validated('panorama_titles');

        $this->tourService->storePanoramas($project, $files, $titles);

        return back()->with('success', 'Panoramas añadidos correctamente.');
    }

    public function update(
        UpdateProject360PanoramaRequest $request,
        Project $project,
        ProjectAsset $panorama,
    ): RedirectResponse {
        $this->tourService->updatePanorama($project, $panorama, $request->validated('title'));

        return back()->with('success', 'Panorama actualizado correctamente.');
    }

    public function setStart(
        UpdateProject360StartPanoramaRequest $request,
        Project $project,
    ): RedirectResponse {
        $panorama = ProjectAsset::query()->findOrFail($request->integer('panorama_id'));
        $this->tourService->setStartPanorama($project, $panorama);

        return back()->with('success', 'Panorama inicial actualizado correctamente.');
    }

    public function destroy(Project $project, ProjectAsset $panorama): RedirectResponse
    {
        $this->tourService->deletePanorama($project, $panorama);

        return back()->with('success', 'Panorama eliminado correctamente.');
    }
}
