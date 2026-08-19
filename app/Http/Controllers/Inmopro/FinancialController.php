<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialController extends Controller
{
    public function index(Request $request): Response
    {
        $statusLibre = LotStatus::where('code', 'LIBRE')->first();
        $statusPreReserva = LotStatus::where('code', 'PRERESERVA')->first();
        $query = Lot::with(['project', 'client', 'status'])
            ->withSum('expenses', 'amount')
            ->withSum('commissions', 'amount')
            ->when($statusLibre, fn ($q) => $q->where('lot_status_id', '!=', $statusLibre->id))
            ->when($statusPreReserva, fn ($q) => $q->where('lot_status_id', '!=', $statusPreReserva->id));

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }
        if ($request->filled('team_id')) {
            $query->whereHas('advisor', fn ($advisorQuery) => $advisorQuery->where('team_id', $request->integer('team_id')));
        }
        if ($request->filled('start_date')) {
            $query->whereDate('contract_date', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('contract_date', '<=', $request->input('end_date'));
        }
        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('id', 'like', "%{$term}%")
                    ->orWhereHas('client', fn ($q2) => $q2->where('name', 'like', "%{$term}%")
                        ->orWhere('dni', 'like', "%{$term}%"));
            });
        }

        $totalValue = (clone $query)->sum('sale_price');
        $totalCollected = (clone $query)->sum('advance');
        $totalPending = $totalValue - $totalCollected;
        $filterParams = array_filter([
            'project_id' => $request->input('project_id'),
            'search' => $request->input('search'),
            'team_id' => $request->input('team_id'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
        ], fn ($value) => $value !== null && $value !== '');

        $lots = $query
            ->orderByDesc('contract_date')
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->appends($filterParams);
        $lots->getCollection()->each(function (Lot $lot): void {
            $lot->setAttribute('financial_metrics', $lot->financialMetrics());
        });
        $projects = Project::query()->orderBy('name')->get();
        $teams = Team::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']);

        return Inertia::render('inmopro/financial', [
            'lots' => $lots,
            'projects' => $projects,
            'teams' => $teams,
            'totalValue' => $totalValue,
            'totalCollected' => $totalCollected,
            'totalPending' => $totalPending,
            'totalExpenses' => (clone $query)->get()->sum(fn (Lot $lot) => (float) ($lot->expenses_sum_amount ?? 0)),
            'totalCommissions' => (clone $query)->get()->sum(fn (Lot $lot) => (float) ($lot->commissions_sum_amount ?? 0)),
            'filters' => [
                'project_id' => $request->input('project_id'),
                'search' => $request->input('search'),
                'team_id' => $request->input('team_id'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
            ],
        ]);
    }
}
