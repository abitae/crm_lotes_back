<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientStatus;
use App\Services\Crm\AdvisorCrmCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientStatusController extends Controller
{
    public function index(Request $request, AdvisorCrmCatalogService $catalog): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $catalog->ensureDefaults($advisor);

        $statuses = ClientStatus::query()
            ->forAdvisor($advisor->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'color', 'sort_order']);

        return response()->json([
            'data' => $statuses->map(fn (ClientStatus $status): array => [
                'id' => $status->id,
                'code' => $status->code,
                'name' => $status->name,
                'color' => $status->color,
                'sort_order' => $status->sort_order,
            ])->all(),
        ]);
    }
}
