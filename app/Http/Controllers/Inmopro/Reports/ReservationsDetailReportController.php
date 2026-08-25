<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\LotStatus;
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

class ReservationsDetailReportController extends Controller
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
        return Inertia::render('inmopro/reports/reservations', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request, forExport: true);
        $payload['tableHeaders'] = [
            'Celular', 'N° op.', 'Adelanto', 'Monto', 'Proyecto', 'MZ', 'Lote', 'Estado', 'Asesor', 'Grupo', 'F. contrato', 'F. límite',
        ];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['client_phone'] ?? '',
                $row['operation_number'] ?? '',
                number_format((float) $row['advance'], 2),
                number_format((float) $row['price'], 2),
                $row['project_name'] ?? '',
                $row['block'] ?? '',
                (string) $row['number'],
                $row['status_name'] ?? '',
                $row['advisor_name'] ?? '',
                $row['team_name'] ?? '',
                $row['contract_date'] ?? '',
                $row['payment_limit_date'] ?? '',
            ],
            $payload['rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'detalle-reservas');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request, forExport: true);

        return $this->csvResponse(
            'detalle-reservas',
            [
                'Celular', 'N° operación', 'Adelanto', 'Monto', 'Proyecto', 'MZ', 'Lote',
                'Estado', 'Asesor', 'Grupo', 'Fecha contrato', 'Fecha límite pago',
            ],
            fn () => array_map(
                fn (array $row) => [
                    $row['client_phone'] ?? '',
                    $row['operation_number'] ?? '',
                    number_format((float) $row['advance'], 2, '.', ''),
                    number_format((float) $row['price'], 2, '.', ''),
                    $row['project_name'] ?? '',
                    $row['block'] ?? '',
                    (string) $row['number'],
                    $row['status_name'] ?? '',
                    $row['advisor_name'] ?? '',
                    $row['team_name'] ?? '',
                    $row['contract_date'] ?? '',
                    $row['payment_limit_date'] ?? '',
                ],
                $payload['rows']
            )
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Request $request, bool $forExport = false): array
    {
        $dateRange = $this->dateRangeResolver->resolve($request);
        $includePreReserva = $request->boolean('include_prereserva');

        $filters = [
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
            'include_prereserva' => $includePreReserva,
            'include_inactive' => $request->boolean('include_inactive'),
        ];

        $statusCodes = [LotStatus::CODE_RESERVADO];
        if ($includePreReserva) {
            $statusCodes[] = LotStatus::CODE_PRERESERVA;
        }

        $query = $this->lotQueryBuilder
            ->base()
            ->whereHas('status', fn (Builder $q) => $q->whereIn('code', $statusCodes))
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->applyCommonFilters($q, $request))
            ->whereDate('contract_date', '>=', $filters['start_date'])
            ->whereDate('contract_date', '<=', $filters['end_date'])
            ->orderByDesc('contract_date')
            ->orderBy('project_id')
            ->orderBy('block')
            ->orderBy('number');

        if ($forExport) {
            $lots = $query->get();
            $rows = $lots->map(fn ($lot) => $this->lotSerializer->toRow($lot))->all();
            $pagination = null;
        } else {
            $paginator = $query->paginate(25)->withQueryString();
            $rows = collect($paginator->items())->map(fn ($lot) => $this->lotSerializer->toRow($lot))->all();
            $pagination = [
                'data' => $rows,
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'links' => $paginator->linkCollection()->toArray(),
            ];
        }

        return [
            'title' => 'Detalle de reservas',
            'description' => 'Reservas y pre-reservas filtradas por fecha de contrato.',
            'criteriaNote' => 'Filtro de fechas sobre fecha de contrato del lote.',
            'filters' => $filters,
            'rows' => $rows,
            'pagination' => $pagination,
            'summary' => ['total' => $pagination['total'] ?? count($rows)],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/reservations',
            ...$this->filterOptions->all($request),
        ];
    }
}
