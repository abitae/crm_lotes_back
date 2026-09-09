<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientTag;
use App\Services\Crm\AdvisorCrmCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientTagController extends Controller
{
    public function index(Request $request, AdvisorCrmCatalogService $catalog): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        $catalog->ensureDefaults($advisor);

        $tags = ClientTag::query()
            ->forAdvisor($advisor->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'color', 'sort_order']);

        return response()->json([
            'data' => $tags->map(fn (ClientTag $tag): array => [
                'id' => $tag->id,
                'code' => $tag->code,
                'name' => $tag->name,
                'color' => $tag->color,
                'sort_order' => $tag->sort_order,
            ])->all(),
        ]);
    }
}
