<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Services\Inmopro\Reports\ReportDateRangeResolver;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransfersByProjectReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly ReportDateRangeResolver $dateRangeResolver,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/transfers-by-project', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request);
        $payload['tableHeaders'] = ['Cliente', 'Ciudad', 'Proyecto', 'MZ', 'Lote', 'Monto', 'Fecha revisión', 'Cazador'];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['client_name'] ?? '',
                $row['city_name'] ?? '',
                $row['project_name'] ?? '',
                $row['block'] ?? '',
                (string) ($row['number'] ?? ''),
                number_format((float) $row['amount'], 2),
                $row['reviewed_at'] ?? '',
                $row['advisor_name'] ?? '',
            ],
            $payload['detail_rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'transferencias-por-proyecto');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'transferencias-por-proyecto',
            ['Cliente', 'Ciudad', 'Proyecto', 'MZ', 'Lote', 'Monto (S/)', 'Fecha revisión', 'Cazador'],
            fn () => array_map(
                fn (array $row) => [
                    $row['client_name'] ?? '',
                    $row['city_name'] ?? '',
                    $row['project_name'] ?? '',
                    $row['block'] ?? '',
                    (string) ($row['number'] ?? ''),
                    number_format((float) $row['amount'], 2, '.', ''),
                    $row['reviewed_at'] ?? '',
                    $row['advisor_name'] ?? '',
                ],
                $payload['detail_rows']
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
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'advisor_id' => $request->filled('advisor_id') ? $request->integer('advisor_id') : null,
            'client_search' => trim((string) $request->input('client_search', '')) ?: null,
            'include_inactive' => $request->boolean('include_inactive'),
        ];

        $baseQuery = Lot::query()
            ->join('lot_transfer_confirmations as ltc', 'ltc.lot_id', '=', 'lots.id')
            ->join('projects', 'projects.id', '=', 'lots.project_id')
            ->leftJoin('clients', 'clients.id', '=', 'lots.client_id')
            ->leftJoin('cities', 'cities.id', '=', 'clients.city_id')
            ->leftJoin('advisors', 'advisors.id', '=', 'lots.advisor_id')
            ->where('ltc.status', LotTransferConfirmation::STATUS_APPROVED)
            ->whereDate('ltc.reviewed_at', '>=', $filters['start_date'])
            ->whereDate('ltc.reviewed_at', '<=', $filters['end_date'])
            ->when(! $filters['include_inactive'], fn (Builder $q) => $q->where('projects.is_active', true))
            ->when($filters['project_id'], fn (Builder $q, int $pid) => $q->where('lots.project_id', $pid))
            ->when($filters['advisor_id'], fn (Builder $q, int $aid) => $q->where('lots.advisor_id', $aid))
            ->when($filters['client_search'], function (Builder $q, string $search): void {
                $like = '%'.$search.'%';
                $q->where(function (Builder $clientQuery) use ($like): void {
                    $clientQuery
                        ->where('clients.name', 'like', $like)
                        ->orWhere('lots.client_name', 'like', $like)
                        ->orWhere('clients.phone', 'like', $like)
                        ->orWhere('clients.dni', 'like', $like);
                });
            });

        $detailRows = (clone $baseQuery)
            ->select(
                'lots.id',
                DB::raw('COALESCE(clients.name, lots.client_name) as client_name'),
                'cities.name as city_name',
                'projects.name as project_name',
                'lots.project_id',
                'lots.block',
                'lots.number',
                'lots.price as amount',
                'ltc.reviewed_at',
                'advisors.name as advisor_name'
            )
            ->orderByDesc('ltc.reviewed_at')
            ->orderBy('projects.name')
            ->orderBy('lots.block')
            ->orderBy('lots.number')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'client_name' => $row->client_name,
                'city_name' => $row->city_name,
                'project_id' => (int) $row->project_id,
                'project_name' => $row->project_name,
                'block' => $row->block,
                'number' => $row->number,
                'amount' => round((float) $row->amount, 2),
                'reviewed_at' => $row->reviewed_at
                    ? \Illuminate\Support\Carbon::parse($row->reviewed_at)->format('Y-m-d')
                    : null,
                'advisor_name' => $row->advisor_name,
            ])
            ->all();

        $monthNames = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
        ];

        $rows = collect($detailRows)
            ->filter(fn (array $row) => filled($row['reviewed_at']))
            ->groupBy(function (array $row): string {
                $date = \Illuminate\Support\Carbon::parse((string) $row['reviewed_at']);

                return $row['project_id'].'-'.$date->format('Y-m');
            })
            ->map(function ($group) use ($monthNames): array {
                $first = $group->first();
                $date = \Illuminate\Support\Carbon::parse((string) $first['reviewed_at']);
                $month = (int) $date->format('n');

                return [
                    'project_id' => $first['project_id'],
                    'project_name' => $first['project_name'],
                    'year' => (int) $date->format('Y'),
                    'month' => $month,
                    'month_label' => $monthNames[$month] ?? (string) $month,
                    'transfer_count' => $group->count(),
                    'transfer_amount' => round((float) $group->sum('amount'), 2),
                ];
            })
            ->sortBy([
                ['project_name', 'asc'],
                ['year', 'asc'],
                ['month', 'asc'],
            ])
            ->values()
            ->all();

        return [
            'title' => 'Transferencias por proyecto',
            'description' => 'Detalle y consolidado de transferencias aprobadas por rango de fechas y proyecto.',
            'criteriaNote' => 'Fecha = revisión de confirmación APROBADA. Detalle: cliente, ciudad, proyecto y monto.',
            'filters' => $filters,
            'rows' => $rows,
            'detail_rows' => $detailRows,
            'summary' => [
                'total_count' => count($detailRows),
                'total_amount' => round((float) collect($detailRows)->sum('amount'), 2),
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/transfers-by-project',
            ...$this->filterOptions->all($request),
        ];
    }
}
