<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Services\Inmopro\Reports\LotDetailSerializer;
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

class ContractsWeekReportController extends Controller
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
        return Inertia::render('inmopro/reports/contracts-week', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        return $this->pdfResponse($request, $this->buildPayload($request), 'inmopro.reports.contracts-week-pdf', 'contratos-semana');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'contratos-semana',
            ['Tipo', 'Celular', 'N° operación', 'Monto', 'Proyecto', 'MZ', 'Lote', 'Asesor', 'Fecha contrato', 'Fecha límite'],
            function () use ($payload): iterable {
                foreach ($payload['reserved_rows'] as $row) {
                    yield array_merge(['Reservado'], $this->csvRow($row));
                }
                foreach ($payload['transferred_rows'] as $row) {
                    yield array_merge(['Transferido'], $this->csvRow($row));
                }
            }
        );
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<string>
     */
    private function csvRow(array $row): array
    {
        return [
            $row['client_phone'] ?? '',
            $row['operation_number'] ?? '',
            number_format((float) $row['price'], 2, '.', ''),
            $row['project_name'] ?? '',
            $row['block'] ?? '',
            (string) $row['number'],
            $row['advisor_name'] ?? '',
            $row['contract_date'] ?? '',
            $row['payment_limit_date'] ?? '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Request $request): array
    {
        $week = $this->dateRangeResolver->resolveWeek($request);
        $filters = [
            'week_date' => $request->input('week_date'),
            'start_date' => $week['start_date'],
            'end_date' => $week['end_date'],
        ];

        $reservedLots = $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->whereStatusCode($q, LotStatus::CODE_RESERVADO))
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->applyCommonFilters($q, $request))
            ->whereDate('contract_date', '>=', $filters['start_date'])
            ->whereDate('contract_date', '<=', $filters['end_date'])
            ->orderBy('contract_date')
            ->get();

        $transferredLotIds = Lot::query()
            ->join('lot_transfer_confirmations as ltc', 'ltc.lot_id', '=', 'lots.id')
            ->where('ltc.status', LotTransferConfirmation::STATUS_APPROVED)
            ->whereBetween(DB::raw('DATE(ltc.reviewed_at)'), [$filters['start_date'], $filters['end_date']])
            ->pluck('lots.id');

        $transferredLots = $this->lotQueryBuilder
            ->base()
            ->whereIn('lots.id', $transferredLotIds)
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->applyCommonFilters($q, $request))
            ->orderBy('contract_date')
            ->get();

        $reservedRows = $reservedLots->map(fn ($lot) => $this->lotSerializer->toRow($lot))->values()->all();
        $transferredRows = $transferredLots->map(fn ($lot) => $this->lotSerializer->toRow($lot))->values()->all();

        return [
            'title' => 'Contratos de la semana',
            'description' => 'Reservados por fecha de contrato y transferidos por fecha de aprobación en la semana.',
            'criteriaNote' => 'Semana calendario (lunes a domingo). Transferidos según revisión de confirmación APROBADA.',
            'filters' => $filters,
            'reserved_rows' => $reservedRows,
            'transferred_rows' => $transferredRows,
            'summary' => [
                'reserved_count' => count($reservedRows),
                'transferred_count' => count($transferredRows),
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/contracts-week',
            ...$this->filterOptions->all(),
        ];
    }
}
