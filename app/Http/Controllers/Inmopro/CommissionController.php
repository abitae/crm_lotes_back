<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use App\Services\Inmopro\CommissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommissionController extends Controller
{
    public function __construct(
        private CommissionService $commissionService
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());
        $query = Commission::with(['lot.project', 'advisor.level', 'status']);

        $query->whereDate('date', '>=', $startDate)->whereDate('date', '<=', $endDate);
        if ($request->filled('project_id')) {
            $query->whereHas('lot', fn ($lotQuery) => $lotQuery->where('project_id', $request->integer('project_id')));
        }
        if ($request->filled('team_id')) {
            $query->whereHas('advisor', fn ($advisorQuery) => $advisorQuery->where('team_id', $request->integer('team_id')));
        }
        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->whereHas('advisor', fn ($q) => $q->where('name', 'like', "%{$term}%"));
        }

        $totalCommissions = (clone $query)->sum('amount');
        $commissions = $query->orderBy('date', 'desc')->paginate(20)->withQueryString();
        $pendingStatus = CommissionStatus::where('code', 'PENDIENTE')->first();
        $paidStatus = CommissionStatus::where('code', 'PAGADO')->first();

        return Inertia::render('inmopro/commissions', [
            'commissions' => $commissions,
            'totalCommissions' => $totalCommissions,
            'commissionStatuses' => CommissionStatus::orderBy('sort_order')->get(),
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
            'teams' => Team::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'filters' => [
                ...$request->only('project_id', 'team_id', 'search'),
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    public function markAsPaid(Commission $commission): RedirectResponse
    {
        $this->commissionService->markAsPaid($commission);

        return back();
    }
}
