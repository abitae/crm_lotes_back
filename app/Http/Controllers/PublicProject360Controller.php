<?php

namespace App\Http\Controllers;

use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\Project360ShareService;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Support\Facades\Storage;
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
            fn (ProjectAsset $floorPlan): string => $this->shareService->floorPlanUrl($shareLink, $floorPlan),
        );

        abort_if($payload['panoramas'] === [], 404, 'El tour no tiene panoramas disponibles.');

        $shareLink->updateQuietly(['last_accessed_at' => now()]);

        return Inertia::render('public/project-360/show', [
            'project' => [
                'name' => $project->name,
            ],
            'tour' => $payload,
        ]);
    }

    public function floorPlan(Project360ShareLink $shareLink, ProjectAsset $floorPlan): StreamedResponse
    {
        $this->shareService->ensureAccessible($shareLink);
        $project = $shareLink->tour->project;

        abort_unless(
            $floorPlan->project_id === $project->id
            && $floorPlan->kind === ProjectAsset::KIND_FLOOR_PLAN
            && $floorPlan->is_active,
            404,
        );
        abort_unless(Storage::disk($floorPlan->disk)->exists($floorPlan->path), 404);

        return Storage::disk($floorPlan->disk)->response(
            $floorPlan->path,
            $floorPlan->file_name,
            [
                'Content-Type' => $floorPlan->mime_type,
                'Content-Disposition' => 'inline; filename="'.addcslashes($floorPlan->file_name, '"\\').'"',
                'Cache-Control' => 'private, max-age=300, must-revalidate',
            ],
        );
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
        abort_unless(Storage::disk($panorama->disk)->exists($panorama->path), 404);

        return Storage::disk($panorama->disk)->response(
            $panorama->path,
            $panorama->file_name,
            [
                'Content-Type' => $panorama->mime_type,
                'Content-Disposition' => 'inline; filename="'.addcslashes($panorama->file_name, '"\\').'"',
                'Cache-Control' => 'private, max-age=300, must-revalidate',
            ],
        );
    }
}
