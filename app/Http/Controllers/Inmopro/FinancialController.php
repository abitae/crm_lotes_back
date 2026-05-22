<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialController extends Controller
{
    public function index(Request $request): Response
    {
        $startDate = $request->filled('start_date')
            ? $request->string('start_date')->toString()
            : now()->startOfMonth()->toDateString();
        $endDate = $request->filled('end_date')
            ? $request->string('end_date')->toString()
            : now()->toDateString();

        $statusLibre = LotStatus::where('code', 'LIBRE')->first();
        $statusPreReserva = LotStatus::where('code', 'PRERESERVA')->first();
        $query = Lot::with(['project', 'client', 'status'])
            ->whereHas('project', fn ($projectQuery) => $projectQuery->active())
            ->when($statusLibre, fn ($q) => $q->where('lot_status_id', '!=', $statusLibre->id))
            ->when($statusPreReserva, fn ($q) => $q->where('lot_status_id', '!=', $statusPreReserva->id))
            ->whereDate('contract_date', '>=', $startDate)
            ->whereDate('contract_date', '<=', $endDate);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }
        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('id', 'like', "%{$term}%")
                    ->orWhereHas('client', fn ($q2) => $q2->where('name', 'like', "%{$term}%")
                        ->orWhere('dni', 'like', "%{$term}%"));
            });
        }

        $totalValue = (clone $query)->sum('price');
        $totalCollected = (clone $query)->sum('advance');
        $totalPending = $totalValue - $totalCollected;
        $filterParams = array_filter([
            'project_id' => $request->input('project_id'),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'search' => $request->input('search'),
        ], fn ($value) => $value !== null && $value !== '');

        $lots = $query
            ->orderByDesc('contract_date')
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->appends($filterParams);
        $projects = Project::query()->active()->orderBy('name')->get();

        return Inertia::render('inmopro/financial', [
            'lots' => $lots,
            'projects' => $projects,
            'totalValue' => $totalValue,
            'totalCollected' => $totalCollected,
            'totalPending' => $totalPending,
            'filters' => [
                'project_id' => $request->input('project_id'),
                'start_date' => $startDate,
                'end_date' => $endDate,
                'search' => $request->input('search'),
            ],
        ]);
    }
}
