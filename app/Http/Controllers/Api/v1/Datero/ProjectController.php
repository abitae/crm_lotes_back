<?php

namespace App\Http\Controllers\Api\v1\Datero;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Project;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'location', 'tour_360_url']);

        return response()->json([
            'data' => $projects->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'location' => $project->location,
                'tour_360_url' => $project->tour_360_url,
            ])->all(),
        ]);
    }
}
