<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ReportSalesConfig;
use App\Models\Inmopro\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class SalesReportService
{
    public function __construct(
        private readonly ReportDateRangeResolver $dateRangeResolver,
        private readonly LotReportQueryBuilder $lotQueryBuilder,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(Request $request): array
    {
        $view = $this->resolveView($request);
        $dateRange = $this->dateRangeResolver->resolve($request);

        $filters = [
            'view' => $view,
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'advisor_id' => $request->filled('advisor_id') ? $request->integer('advisor_id') : null,
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
        ];

        $projects = Project::query()->orderBy('name')->get(['id', 'name']);
        $teams = Team::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color', 'is_active', 'group_sales_goal']);
        $advisors = Advisor::query()
            ->with('team:id,name,color')
            ->orderBy('name')
            ->get(['id', 'name', 'team_id', 'personal_quota']);

        $lots = $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $query) => $this->lotQueryBuilder->excludingLibreAndPreReserva($query))
            ->when($filters['project_id'], fn (Builder $builder, int $projectId) => $builder->where('project_id', $projectId))
            ->when($filters['advisor_id'], fn (Builder $builder, int $advisorId) => $builder->where('advisor_id', $advisorId))
            ->when($filters['team_id'], fn (Builder $builder, int $teamId) => $builder->whereHas('advisor', fn (Builder $advisorQuery) => $advisorQuery->where('team_id', $teamId)))
            ->whereDate('contract_date', '>=', $filters['start_date'])
            ->whereDate('contract_date', '<=', $filters['end_date'])
            ->get();

        $filteredAdvisors = $advisors
            ->when($filters['team_id'], fn (Collection $collection) => $collection->where('team_id', $filters['team_id']))
            ->when($filters['advisor_id'], fn (Collection $collection) => $collection->where('id', $filters['advisor_id']))
            ->values();

        $rows = match ($view) {
            'projects' => $this->buildProjectRows($projects, $lots),
            'teams' => $this->buildTeamRows($teams, $filteredAdvisors, $lots),
            default => $this->buildAdvisorRows($filteredAdvisors, $lots),
        };

        $generalSalesGoal = (float) ReportSalesConfig::current()->general_sales_goal;

        $summary = [
            'sold_amount' => round((float) collect($rows)->sum('sold_amount'), 2),
            'goal_amount' => round($generalSalesGoal, 2),
            'collected_amount' => round((float) collect($rows)->sum('collected_amount'), 2),
            'pending_amount' => round((float) collect($rows)->sum('pending_amount'), 2),
            'lots_count' => (int) collect($rows)->sum('lots_count'),
            'entities_count' => count($rows),
        ];
        $summary['pct'] = $summary['goal_amount'] > 0
            ? (int) round(($summary['sold_amount'] / $summary['goal_amount']) * 100)
            : 0;

        $summary['rows_goal_sum'] = round((float) collect($rows)->sum('goal_amount'), 2);
        $summary['avg_sale_per_lot'] = $summary['lots_count'] > 0
            ? round($summary['sold_amount'] / $summary['lots_count'], 2)
            : 0.0;
        $summary['collection_pct'] = $summary['sold_amount'] > 0
            ? (int) round(($summary['collected_amount'] / $summary['sold_amount']) * 100)
            : 0;

        return [
            'view' => $view,
            'viewLabel' => $this->viewLabel($view),
            'filters' => $filters,
            'summary' => $summary,
            'rows' => $rows,
            'projects' => $projects,
            'teams' => $teams,
            'advisors' => $filteredAdvisors->values(),
            'generatedAt' => now()->format('d/m/Y H:i'),
            'filterLabels' => $this->buildFilterLabels($filters, $projects, $teams, $advisors),
            'reportSettingsUrl' => route('inmopro.report-settings.edit'),
        ];
    }

    private function resolveView(Request $request): string
    {
        $view = (string) $request->input('view', 'projects');

        if (! in_array($view, ['projects', 'teams', 'advisors'], true)) {
            return 'projects';
        }

        return $view;
    }

    /**
     * @param  Collection<int, Project>  $projects
     * @param  Collection<int, Lot>  $lots
     * @return array<int, array<string, mixed>>
     */
    private function buildProjectRows(Collection $projects, Collection $lots): array
    {
        return $projects->map(function (Project $project) use ($lots): array {
            $projectLots = $lots->where('project_id', $project->id)->values();
            $projectAdvisors = $projectLots
                ->pluck('advisor')
                ->filter()
                ->unique('id')
                ->values();

            return $this->makeRow(
                $project->id,
                $project->name,
                $projectLots,
                (float) $projectAdvisors->sum('personal_quota')
            );
        })->filter(fn (array $row) => $row['lots_count'] > 0)->sortByDesc('sold_amount')->values()->all();
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @param  Collection<int, Advisor>  $advisors
     * @param  Collection<int, Lot>  $lots
     * @return array<int, array<string, mixed>>
     */
    private function buildTeamRows(Collection $teams, Collection $advisors, Collection $lots): array
    {
        return $teams->map(function (Team $team) use ($advisors, $lots): array {
            $teamAdvisors = $advisors->where('team_id', $team->id)->values();
            $teamLots = $lots->filter(fn (Lot $lot) => $lot->advisor?->team_id === $team->id)->values();
            $quotaSum = (float) $teamAdvisors->sum('personal_quota');
            $groupGoal = (float) ($team->group_sales_goal ?? 0);
            $goalAmount = $groupGoal > 0 ? $groupGoal : $quotaSum;

            return $this->makeRow(
                $team->id,
                $team->name,
                $teamLots,
                $goalAmount,
                ['color' => $team->color]
            );
        })->filter(fn (array $row) => $row['lots_count'] > 0 || $row['goal_amount'] > 0)->sortByDesc('sold_amount')->values()->all();
    }

    /**
     * @param  Collection<int, Advisor>  $advisors
     * @param  Collection<int, Lot>  $lots
     * @return array<int, array<string, mixed>>
     */
    private function buildAdvisorRows(Collection $advisors, Collection $lots): array
    {
        return $advisors->map(function (Advisor $advisor) use ($lots): array {
            $advisorLots = $lots->where('advisor_id', $advisor->id)->values();

            return $this->makeRow(
                $advisor->id,
                $advisor->name,
                $advisorLots,
                (float) $advisor->personal_quota,
                [
                    'team_name' => $advisor->team?->name,
                    'color' => $advisor->team?->color,
                ]
            );
        })->filter(fn (array $row) => $row['lots_count'] > 0 || $row['goal_amount'] > 0)->sortByDesc('sold_amount')->values()->all();
    }

    /**
     * @param  Collection<int, Lot>  $lots
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function makeRow(int $id, string $label, Collection $lots, float $goalAmount, array $extra = []): array
    {
        $soldAmount = (float) $lots->sum(fn (Lot $lot) => (float) $lot->price);
        $collectedAmount = (float) $lots->sum(fn (Lot $lot) => $this->collectedAmountForLot($lot));
        $pendingAmount = (float) $lots->sum(fn (Lot $lot) => (float) ($lot->remaining_balance ?? 0));
        $lotsCount = $lots->count();
        $pct = $goalAmount > 0 ? (int) round(($soldAmount / $goalAmount) * 100) : 0;

        return [
            'id' => $id,
            'label' => $label,
            'sold_amount' => round($soldAmount, 2),
            'goal_amount' => round($goalAmount, 2),
            'collected_amount' => round($collectedAmount, 2),
            'pending_amount' => round($pendingAmount, 2),
            'lots_count' => $lotsCount,
            'pct' => $pct,
            ...$extra,
        ];
    }

    private function collectedAmountForLot(Lot $lot): float
    {
        $paymentsTotal = (float) $lot->payments->sum('amount');

        if ($paymentsTotal > 0) {
            return $paymentsTotal;
        }

        return (float) ($lot->advance ?? 0);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  Collection<int, Project>  $projects
     * @param  Collection<int, Team>  $teams
     * @param  Collection<int, Advisor>  $advisors
     * @return array<string, string|null>
     */
    private function buildFilterLabels(array $filters, Collection $projects, Collection $teams, Collection $advisors): array
    {
        return [
            'project' => $filters['project_id']
                ? $projects->firstWhere('id', $filters['project_id'])?->name
                : null,
            'team' => $filters['team_id']
                ? $teams->firstWhere('id', $filters['team_id'])?->name
                : null,
            'advisor' => $filters['advisor_id']
                ? $advisors->firstWhere('id', $filters['advisor_id'])?->name
                : null,
            'start_date' => $filters['start_date']
                ? Carbon::parse($filters['start_date'])->format('d/m/Y')
                : null,
            'end_date' => $filters['end_date']
                ? Carbon::parse($filters['end_date'])->format('d/m/Y')
                : null,
        ];
    }

    private function viewLabel(string $view): string
    {
        return match ($view) {
            'teams' => 'Equipos',
            'advisors' => 'Vendedores',
            default => 'Proyectos',
        };
    }
}
