<?php

namespace App\Http\Controllers\Api\v1\Datero;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrationLookupController extends Controller
{
    public function cities(Request $request): JsonResponse
    {
        $cities = City::query()
            ->where('is_active', true)
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = (string) $request->input('search');
                $query->where(function ($nestedQuery) use ($term) {
                    $nestedQuery->where('name', 'like', '%'.$term.'%')
                        ->orWhere('department', 'like', '%'.$term.'%');
                });
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $cities->map(fn (City $city): array => [
                'id' => $city->id,
                'name' => $city->name,
                'department' => $city->department,
                'code' => $city->code,
            ])->all(),
        ]);
    }

    public function advisors(Request $request): JsonResponse
    {
        $advisors = Advisor::query()
            ->with('team:id,name,color')
            ->where('is_active', true)
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = (string) $request->input('search');
                $query->where(function ($nestedQuery) use ($term) {
                    $nestedQuery->where('name', 'like', '%'.$term.'%')
                        ->orWhere('email', 'like', '%'.$term.'%')
                        ->orWhere('username', 'like', '%'.$term.'%');
                });
            })
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'email', 'team_id']);

        return response()->json([
            'data' => $advisors->map(fn (Advisor $advisor): array => [
                'id' => $advisor->id,
                'name' => $advisor->name,
                'email' => $advisor->email,
                'team' => $advisor->team ? [
                    'id' => $advisor->team->id,
                    'name' => $advisor->team->name,
                    'color' => $advisor->team->color,
                ] : null,
            ])->all(),
        ]);
    }
}
