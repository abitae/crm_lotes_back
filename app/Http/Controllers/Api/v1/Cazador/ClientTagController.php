<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\ClientTag;
use Illuminate\Http\JsonResponse;

class ClientTagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = ClientTag::query()
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
