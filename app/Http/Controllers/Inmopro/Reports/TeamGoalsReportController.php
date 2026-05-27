<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Team;
use App\Services\Inmopro\Reports\LotDetailSerializer;
use App\Services\Inmopro\Reports\LotReportQueryBuilder;
use App\Services\Inmopro\Reports\ReportDateRangeResolver;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeamGoalsReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly ReportDateRangeResolver $dateRangeResolver,
        private readonly LotReportQueryBuilder $lotQueryBuilder,
        private readonly LotDetailSerializer $lotSerializer,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/team-goals', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        return $this->pdfResponse($request, $this->buildPayload($request), 'inmopro.reports.team-goals-pdf', 'meta-grupal');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'meta-grupal',
            ['Equipo', 'Ventas (S/)', 'Meta (S/)', '%', 'Lotes'],
            fn () => array_map(
                fn (array $row) => [
                    $row['team_name'],
                    number_format((float) $row['sold_amount'], 2, '.', ''),
                    number_format((float) $row['goal_amount'], 2, '.', ''),
                    (string) $row['pct'],
                    (string) $row['lots_count'],
                ],
                $payload['rows']
            )
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Request $request): array
    {
        $dateRange = $this->dateRangeResolver->resolve($request);
        $filters = [
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
        ];

        $teams = Team::query()
            ->when($filters['team_id'], fn (Builder $q, int $id) => $q->where('id', $id))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'group_sales_goal']);

        $lots = $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->excludingLibreAndPreReserva($q))
            ->whereDate('contract_date', '>=', $filters['start_date'])
            ->whereDate('contract_date', '<=', $filters['end_date'])
            ->get();

        $options = $this->filterOptions->all();

        $rows = $teams->map(function (Team $team) use ($lots, $options): array {
            $teamLots = $lots->filter(fn (Lot $lot) => $lot->advisor?->team_id === $team->id)->values();
            $quotaSum = (float) $options['advisors']
                ->where('team_id', $team->id)
                ->sum('personal_quota');
            $groupGoal = (float) ($team->group_sales_goal ?? 0);
            $goalAmount = $groupGoal > 0 ? $groupGoal : $quotaSum;
            $soldAmount = (float) $teamLots->sum(fn (Lot $lot) => (float) $lot->price);
            $pct = $goalAmount > 0 ? (int) round(($soldAmount / $goalAmount) * 100) : 0;

            return [
                'id' => $team->id,
                'team_name' => $team->name,
                'color' => $team->color,
                'sold_amount' => round($soldAmount, 2),
                'goal_amount' => round($goalAmount, 2),
                'lots_count' => $teamLots->count(),
                'pct' => $pct,
                'detail' => $teamLots->map(fn (Lot $lot) => $this->lotSerializer->toRow($lot))->values()->all(),
            ];
        })->filter(fn (array $row) => $row['lots_count'] > 0 || $row['goal_amount'] > 0)->values()->all();

        $selectedTeamId = $filters['team_id'] ?? ($rows[0]['id'] ?? null);
        $detailRows = collect($rows)->firstWhere('id', $selectedTeamId)['detail'] ?? [];

        return [
            'title' => 'Meta grupal por equipo',
            'description' => 'Ventas del periodo vs meta grupal con detalle de lotes.',
            'criteriaNote' => 'Ventas por fecha de contrato. Meta = group_sales_goal o suma de cuotas personales.',
            'filters' => $filters,
            'rows' => $rows,
            'detail_rows' => $detailRows,
            'selected_team_id' => $selectedTeamId,
            'summary' => [
                'total_sold' => round((float) collect($rows)->sum('sold_amount'), 2),
                'total_goal' => round((float) collect($rows)->sum('goal_amount'), 2),
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/team-goals',
            ...$options,
        ];
    }
}
