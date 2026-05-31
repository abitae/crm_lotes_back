<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\AttentionTicketType;
use Illuminate\Http\JsonResponse;

class AttentionTicketTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $types = AttentionTicketType::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $types->map(fn (AttentionTicketType $type): array => [
                'id' => $type->id,
                'name' => $type->name,
                'code' => $type->code,
                'description' => $type->description,
                'color' => $type->color,
                'allows_overlap' => $type->allows_overlap,
            ])->all(),
        ]);
    }
}
