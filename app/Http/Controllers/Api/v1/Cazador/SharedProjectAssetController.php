<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\ProjectAsset;
use App\Services\Cazador\ProjectAssetShareService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SharedProjectAssetController extends Controller
{
    public function __construct(
        private ProjectAssetShareService $shareService,
    ) {}

    public function show(ProjectAsset $asset): StreamedResponse
    {
        return $this->shareService->streamSharedAsset($asset);
    }
}
