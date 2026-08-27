<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LotController extends Controller
{
    public function show(Request $request, Lot $lot): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $lot->load(['project', 'status']);

        abort_unless($lot->project?->is_active, 404);

        return Inertia::render('crm/lots/show', [
            'lot' => [
                'id' => $lot->id,
                'block' => $lot->block,
                'number' => $lot->number,
                'area' => $lot->area,
                'price' => $lot->price,
                'project' => $lot->project ? [
                    'id' => $lot->project->id,
                    'name' => $lot->project->name,
                ] : null,
                'status' => $lot->status ? [
                    'code' => $lot->status->code,
                    'name' => $lot->status->name,
                    'color' => $lot->status->color,
                ] : null,
                'can_pre_reserve' => $lot->status?->code === 'LIBRE',
            ],
            'clients' => Client::query()
                ->where('advisor_id', $advisor->id)
                ->whereHas('type', fn ($query) => $query->whereIn('code', ['PROPIO', 'DATERO']))
                ->orderBy('name')
                ->get(['id', 'name', 'dni']),
        ]);
    }

    public function indexMine(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $lots = Lot::query()
            ->where('lots.advisor_id', $advisor->id)
            ->whereHas('project', fn ($query) => $query->where('is_active', true))
            ->with(['project:id,name', 'status:id,code,name,color'])
            ->orderBy('project_id')
            ->orderBy('block')
            ->orderBy('number')
            ->get(['id', 'project_id', 'block', 'number', 'area', 'price', 'lot_status_id']);

        return Inertia::render('crm/lots/index', [
            'lots' => $lots,
        ]);
    }
}
