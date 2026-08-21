<?php

namespace App\OpenAi\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\OpenAi\Services\MarkdownKnowledgeSearch;
use App\OpenAi\Services\ProjectKnowledgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeController extends Controller
{
    public function __construct(
        private ProjectKnowledgeService $knowledge,
        private MarkdownKnowledgeSearch $markdownKnowledge,
    ) {}

    public function indexTopics(): JsonResponse
    {
        return response()->json([
            'data' => $this->markdownKnowledge->listTitles(),
        ]);
    }

    public function indexProjects(): JsonResponse
    {
        return response()->json([
            'data' => $this->knowledge->listActiveProjectsPayload(),
        ]);
    }

    public function showProject(Project $project): JsonResponse
    {
        abort_unless($project->is_active, 404);

        return response()->json([
            'data' => $this->knowledge->activeProjectDetailPayload($project->id),
        ]);
    }

    public function indexLots(Request $request): JsonResponse
    {
        $projectId = $request->filled('project_id') ? $request->integer('project_id') : null;
        $search = $request->filled('search') ? (string) $request->input('search') : null;
        $availableOnly = $request->boolean('available_only', true);

        return response()->json([
            'data' => $this->knowledge->searchLotsPayload($projectId, $search, $availableOnly),
        ]);
    }

    public function showLot(Lot $lot): JsonResponse
    {
        return response()->json([
            'data' => $this->knowledge->lotDetailPayload($lot->id),
        ]);
    }
}
