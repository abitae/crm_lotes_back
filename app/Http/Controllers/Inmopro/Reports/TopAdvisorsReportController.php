<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Services\Inmopro\Reports\LotReportQueryBuilder;
use App\Services\Inmopro\Reports\ReportDateRangeResolver;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TopAdvisorsReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly ReportDateRangeResolver $dateRangeResolver,
        private readonly LotReportQueryBuilder $lotQueryBuilder,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/top-advisors', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request);
        $payload['tableHeaders'] = ['Vendedor', 'Equipo', 'Ventas', 'Transferencias', 'Monto transferido'];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['advisor_name'],
                $row['team_name'] ?? '',
                number_format((float) $row['sold_amount'], 2),
                (string) $row['transfer_count'],
                number_format((float) $row['transfer_amount'], 2),
            ],
            $payload['rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'top-cazadores');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'top-cazadores',
            ['Vendedor', 'Equipo', 'Ventas (S/)', 'Transferencias', 'Monto transferido (S/)'],
            fn () => array_map(
                fn (array $row) => [
                    $row['advisor_name'],
                    $row['team_name'] ?? '',
                    number_format((float) $row['sold_amount'], 2, '.', ''),
                    (string) $row['transfer_count'],
                    number_format((float) $row['transfer_amount'], 2, '.', ''),
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
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
        ];

        $options = $this->filterOptions->all();

        $advisorsQuery = Advisor::query()
            ->with('team:id,name,color')
            ->when($filters['team_id'], fn (Builder $q, int $teamId) => $q->where('team_id', $teamId))
            ->orderBy('name');

        $advisors = $advisorsQuery->get(['id', 'name', 'team_id']);

        $soldByAdvisor = $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->excludingLibreAndPreReserva($q))
            ->when($filters['project_id'], fn (Builder $q, int $pid) => $q->where('project_id', $pid))
            ->when($filters['team_id'], fn (Builder $q, int $tid) => $q->whereHas('advisor', fn (Builder $aq) => $aq->where('team_id', $tid)))
            ->whereDate('contract_date', '>=', $filters['start_date'])
            ->whereDate('contract_date', '<=', $filters['end_date'])
            ->whereNotNull('advisor_id')
            ->select('advisor_id', DB::raw('SUM(price) as sold_amount'))
            ->groupBy('advisor_id')
            ->pluck('sold_amount', 'advisor_id');

        $transferStats = Lot::query()
            ->join('lot_transfer_confirmations as ltc', function ($join): void {
                $join->on('ltc.lot_id', '=', 'lots.id')
                    ->where('ltc.status', '=', LotTransferConfirmation::STATUS_APPROVED);
            })
            ->when($filters['project_id'], fn (Builder $q, int $pid) => $q->where('lots.project_id', $pid))
            ->when($filters['team_id'], fn (Builder $q, int $tid) => $q->whereHas('advisor', fn (Builder $aq) => $aq->where('team_id', $tid)))
            ->whereBetween(DB::raw('DATE(ltc.reviewed_at)'), [$filters['start_date'], $filters['end_date'])
            ->whereNotNull('lots.advisor_id')
            ->select(
                'lots.advisor_id',
                DB::raw('COUNT(DISTINCT lots.id) as transfer_count'),
                DB::raw('SUM(lots.price) as transfer_amount')
            )
            ->groupBy('lots.advisor_id')
            ->get()
            ->keyBy('advisor_id');

        $rows = $advisors->map(function (Advisor $advisor) use ($soldByAdvisor, $transferStats): array {
            $transfer = $transferStats->get($advisor->id);

            return [
                'id' => $advisor->id,
                'advisor_name' => $advisor->name,
                'team_name' => $advisor->team?->name,
                'color' => $advisor->team?->color,
                'sold_amount' => round((float) ($soldByAdvisor[$advisor->id] ?? 0), 2),
                'transfer_count' => (int) ($transfer->transfer_count ?? 0),
                'transfer_amount' => round((float) ($transfer->transfer_amount ?? 0), 2),
            ];
        })
            ->filter(fn (array $row) => $row['sold_amount'] > 0 || $row['transfer_count'] > 0)
            ->sortByDesc('sold_amount')
            ->values()
            ->all();

        return [
            'title' => 'Top cazadores (vendedores)',
            'description' => 'Ranking por ventas (fecha de contrato) y transferencias aprobadas en el periodo.',
            'criteriaNote' => 'Cazador = vendedor asignado al lote. Transferencia = confirmación APROBADA según fecha de revisión.',
            'filters' => $filters,
            'rows' => $rows,
            'summary' => [
                'advisors_count' => count($rows),
                'total_sold' => round((float) collect($rows)->sum('sold_amount'), 2),
                'total_transfers' => (int) collect($rows)->sum('transfer_count'),
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/top-advisors',
            ...$options,
        ];
    }
}
