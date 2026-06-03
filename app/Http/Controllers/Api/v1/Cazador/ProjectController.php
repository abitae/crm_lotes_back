<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Support\FileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()
            ->where('is_active', true)
            ->withCount('lots')
            ->withCount([
                'assets as images_count' => fn ($query) => $query->where('kind', 'image')->where('is_active', true),
                'assets as documents_count' => fn ($query) => $query->where('kind', 'document')->where('is_active', true),
            ])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $projects->map(fn (Project $project) => $this->projectPayload($project))->all(),
        ]);
    }

    public function show(Project $project): JsonResponse
    {
        abort_unless($project->is_active, 404);

        $project->loadCount([
            'lots',
            'assets as images_count' => fn ($query) => $query->where('kind', 'image')->where('is_active', true),
            'assets as documents_count' => fn ($query) => $query->where('kind', 'document')->where('is_active', true),
        ]);
        $project->load(['assets' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')->orderBy('id')]);

        return response()->json([
            'data' => $this->projectPayload($project, true),
        ]);
    }

    public function downloadAsset(Request $request, Project $project, ProjectAsset $asset): StreamedResponse
    {
        abort_unless($asset->project_id === $project->id && $asset->is_active, 404);

        return FileStorage::filesystem()->download($asset->file_path, $asset->file_name);
    }

    /**
     * @return array<string, mixed>
     */
    private function projectPayload(Project $project, bool $includeAssets = false): array
    {
        $payload = [
            'id' => $project->id,
            'name' => $project->name,
            'location' => $project->location,
            'total_lots' => $project->total_lots,
            'lots_count' => $project->lots_count,
            'images_count' => $project->images_count ?? null,
            'documents_count' => $project->documents_count ?? null,
        ];

        if (! $includeAssets) {
            return $payload;
        }

        $assets = $project->assets ?? collect();

        return [
            ...$payload,
            'blocks' => $project->blocks,
            'assets' => $assets->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))->values()->all(),
            'images' => $assets->where('kind', 'image')->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))->values()->all(),
            'documents' => $assets->where('kind', 'document')->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function assetPayload(Project $project, ProjectAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'kind' => $asset->kind,
            'title' => $asset->title,
            'file_name' => $asset->file_name,
            'mime_type' => $asset->mime_type,
            'file_size' => $asset->file_size,
            'download_url' => route('api.v1.cazador.projects.assets.download', [$project, $asset]),
        ];
    }
}
