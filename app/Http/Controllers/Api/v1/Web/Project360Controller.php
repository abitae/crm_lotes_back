<?php

namespace App\Http\Controllers\Api\v1\Web;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class Project360Controller extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
    ) {}

    public function show(Project $project): JsonResponse
    {
        $this->tourService->ensurePubliclyViewable($project);

        $payload = $this->tourService->payload(
            $project,
            fn (ProjectAsset $panorama): string => $this->tourService->publicJsonPanoramaUrl($project, $panorama),
        );

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'tour' => $payload,
        ]);
    }

    public function panorama(Project $project, ProjectAsset $panorama): StreamedResponse
    {
        return $this->tourService->streamPublicPanorama($project, $panorama);
    }
}
