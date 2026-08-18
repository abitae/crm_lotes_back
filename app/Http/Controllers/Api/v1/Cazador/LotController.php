<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Cazador\IndexMyLotsRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LotController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $lots = Lot::query()
            ->with(['project', 'status', 'preReservations' => fn ($query) => $query->whereIn('status', ['PENDIENTE', 'APROBADA'])])
            ->when($request->filled('project_id'), fn ($query) => $query->where('project_id', $request->integer('project_id')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = (string) $request->input('search');
                $query->where(function ($nestedQuery) use ($term) {
                    $nestedQuery->where('block', 'like', "%{$term}%")
                        ->orWhere('number', 'like', "%{$term}%");
                });
            })
            ->when($request->boolean('available_only', true), function ($query) {
                $query->whereHas('status', fn ($statusQuery) => $statusQuery->where('code', 'LIBRE'));
            })
            ->orderBy('project_id')
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        return response()->json([
            'data' => $lots->map(fn (Lot $lot) => $this->lotPayload($lot))->all(),
        ]);
    }

    public function show(Lot $lot): JsonResponse
    {
        $lot->load(['project', 'status', 'client', 'advisor', 'preReservations' => fn ($query) => $query->latest()]);

        return response()->json([
            'data' => $this->lotPayload($lot, true),
        ]);
    }

    public function indexMine(IndexMyLotsRequest $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');

        $lots = Lot::query()
            ->where('lots.advisor_id', $advisor->id)
            ->with(['project', 'status', 'client', 'preReservations' => fn ($query) => $query->latest()])
            ->when($request->filled('status'), function ($query) use ($request) {
                $code = (string) $request->input('status');
                $query->whereHas('status', fn ($statusQuery) => $statusQuery->where('code', $code));
            })
            ->when($request->filled('project_id'), fn ($query) => $query->where('project_id', $request->integer('project_id')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = (string) $request->input('search');
                $query->where(function ($nestedQuery) use ($term) {
                    $nestedQuery->where('lots.block', 'like', "%{$term}%")
                        ->orWhere('lots.number', 'like', "%{$term}%");
                });
            })
            ->orderBy('project_id')
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        return response()->json([
            'data' => $lots->map(fn (Lot $lot) => $this->lotPayload($lot, true))->all(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function lotPayload(Lot $lot, bool $withDetail = false): array
    {
        return [
            'id' => $lot->id,
            'block' => $lot->block,
            'number' => $lot->number,
            'area' => $lot->area,
            'price' => $lot->price,
            'project' => $lot->project ? [
                'id' => $lot->project->id,
                'name' => $lot->project->name,
                'location' => $lot->project->location,
            ] : null,
            'status' => $lot->status ? [
                'id' => $lot->status->id,
                'name' => $lot->status->name,
                'code' => $lot->status->code,
                'color' => $lot->status->color,
            ] : null,
            'can_pre_reserve' => $lot->status?->code === 'LIBRE',
            'client' => $withDetail && $lot->client ? [
                'id' => $lot->client->id,
                'name' => $lot->client->name,
            ] : null,
            'advisor' => $withDetail && $lot->advisor ? [
                'id' => $lot->advisor->id,
                'name' => $lot->advisor->name,
            ] : null,
            'pre_reservations' => $withDetail
                ? $lot->preReservations->map(fn ($preReservation) => [
                    'id' => $preReservation->id,
                    'status' => $preReservation->status,
                    'created_at' => optional($preReservation->created_at)->toDateTimeString(),
                ])->all()
                : [],
        ];
    }
}
