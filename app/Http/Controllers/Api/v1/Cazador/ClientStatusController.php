<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\ClientStatus;
use Illuminate\Http\JsonResponse;

class ClientStatusController extends Controller
{
    public function index(): JsonResponse
    {
        $statuses = ClientStatus::query()
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
