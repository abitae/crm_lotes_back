<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\StoreProjectAssetShareLinksRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Project;
use App\Services\Cazador\ProjectAssetShareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ProjectAssetShareLinkController extends Controller
{
    public function __construct(
        private ProjectAssetShareService $shareService,
    ) {}

    public function store(StoreProjectAssetShareLinksRequest $request, Project $project): JsonResponse
    {
        abort_unless($project->is_active, 404);

        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $assetIds = array_map('intval', $request->validated('asset_ids'));
        $assets = $this->shareService->resolveAssetsForProject($project, $assetIds);

        if ($assets->count() !== count(array_unique($assetIds))) {
            return response()->json([
                'message' => 'Uno o más assets no existen o no pertenecen a este proyecto.',
                'errors' => [
                    'asset_ids' => ['Todos los IDs deben corresponder a assets activos del proyecto.'],
                ],
            ], 422);
        }

        $missingFiles = $this->shareService->missingFileAssetIds($assets);

        if ($missingFiles !== []) {
            return response()->json([
                'message' => 'Uno o más archivos no están disponibles en el almacenamiento.',
                'errors' => [
                    'asset_ids' => [
                        'Los siguientes assets no tienen archivo en disco: '.implode(', ', $missingFiles).'.',
                    ],
                ],
            ], 422);
        }

        $expiresAt = now()->addHours($this->shareService->ttlHours());

        $assetsById = $assets->keyBy('id');
        $data = [];

        foreach ($assetIds as $assetId) {
            $asset = $assetsById->get($assetId);
            if ($asset !== null) {
                $data[] = $this->shareService->buildShareLinkPayload($asset, $expiresAt);
            }
        }

        Log::info('cazador.project_asset_share_links.created', [
            'advisor_id' => $advisor->id,
            'project_id' => $project->id,
            'asset_ids' => $assetIds,
            'expires_at' => $expiresAt->toIso8601String(),
            'ip' => $request->ip(),
        ]);

        return response()->json(['data' => $data]);
    }
}
