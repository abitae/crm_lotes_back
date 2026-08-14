<?php

namespace App\Http\Controllers;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\Project360ShareService;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicProject360Controller extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
        private Project360ShareService $shareService,
    ) {}

    public function show(Project360ShareLink $shareLink): Response
    {
        $this->shareService->ensureAccessible($shareLink);
        $tour = $shareLink->tour;
        $project = $tour->project;
        $payload = $this->tourService->payload(
            $project,
            fn (ProjectAsset $panorama): string => $this->shareService->panoramaUrl($shareLink, $panorama),
        );

        abort_if($payload['panoramas'] === [], 404, 'El tour no tiene panoramas disponibles.');

        $shareLink->updateQuietly(['last_accessed_at' => now()]);

        return Inertia::render('public/project-360/show', [
            'project' => [
                'name' => $project->name,
            ],
            'tour' => $payload,
            'embedded' => false,
        ]);
    }

    public function showByProject(Request $request, Project $project): Response
    {
        $this->tourService->ensurePubliclyViewable($project);

        $payload = $this->tourService->payload(
            $project,
            fn (ProjectAsset $panorama): string => $this->tourService->publicPanoramaUrl($project, $panorama),
        );

        return Inertia::render('public/project-360/show', [
            'project' => [
                'name' => $project->name,
            ],
            'tour' => $payload,
            'embedded' => $request->boolean('embed'),
        ]);
    }

    public function panoramaByProject(Project $project, ProjectAsset $panorama): StreamedResponse
    {
        return $this->tourService->streamPublicPanorama($project, $panorama);
    }

    public function panorama(Project360ShareLink $shareLink, ProjectAsset $panorama): StreamedResponse
    {
        $this->shareService->ensureAccessible($shareLink);
        $project = $shareLink->tour->project;

        abort_unless(
            $panorama->project_id === $project->id
            && $panorama->kind === ProjectAsset::KIND_PANORAMA
            && $panorama->is_active,
            404,
        );

        return $panorama->streamInline();
    }
}
