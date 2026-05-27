<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\LotStatus;
use App\Services\Inmopro\Reports\LotDetailSerializer;
use App\Services\Inmopro\Reports\LotReportQueryBuilder;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpiredContractsReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly LotReportQueryBuilder $lotQueryBuilder,
        private readonly LotDetailSerializer $lotSerializer,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/expired-contracts', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request, forExport: true);
        $payload['tableHeaders'] = ['Celular', 'N° op.', 'Monto', 'Proyecto', 'Lote', 'Asesor', 'F. límite', 'Días vencido'];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['client_phone'] ?? '',
                $row['operation_number'] ?? '',
                number_format((float) $row['price'], 2),
                $row['project_name'] ?? '',
                ($row['block'] ?? '').'-'.($row['number'] ?? ''),
                $row['advisor_name'] ?? '',
                $row['payment_limit_date'] ?? '',
                (string) ($row['days_overdue'] ?? ''),
            ],
            $payload['rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'contratos-vencidos');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request, forExport: true);

        return $this->csvResponse(
            'contratos-vencidos',
            ['Celular', 'N° operación', 'Monto', 'Proyecto', 'MZ', 'Lote', 'Asesor', 'Grupo', 'Fecha límite', 'Días vencido'],
            fn () => array_map(
                fn (array $row) => [
                    $row['client_phone'] ?? '',
                    $row['operation_number'] ?? '',
                    number_format((float) $row['price'], 2, '.', ''),
                    $row['project_name'] ?? '',
                    $row['block'] ?? '',
                    (string) $row['number'],
                    $row['advisor_name'] ?? '',
                    $row['team_name'] ?? '',
                    $row['payment_limit_date'] ?? '',
                    (string) ($row['days_overdue'] ?? ''),
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
        $filters = [
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'advisor_id' => $request->filled('advisor_id') ? $request->integer('advisor_id') : null,
        ];

        $query = $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->whereStatusCode($q, LotStatus::CODE_RESERVADO))
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->applyCommonFilters($q, $request))
            ->whereNotNull('payment_limit_date')
            ->whereDate('payment_limit_date', '<', now()->toDateString())
            ->orderBy('payment_limit_date');

        if ($forExport) {
            $rows = $query->get()->map(fn ($lot) => $this->lotSerializer->toRow($lot))->all();
            $pagination = null;
        } else {
            $paginator = $query->paginate(25)->withQueryString();
            $rows = collect($paginator->items())->map(fn ($lot) => $this->lotSerializer->toRow($lot))->all();
            $pagination = [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'links' => $paginator->linkCollection()->toArray(),
            ];
        }

        return [
            'title' => 'Contratos vencidos',
            'description' => 'Reservas con fecha límite de pago vencida y sin transferir.',
            'criteriaNote' => 'Estado RESERVADO y payment_limit_date anterior a hoy.',
            'filters' => $filters,
            'rows' => $rows,
            'pagination' => $pagination,
            'summary' => ['total' => $pagination['total'] ?? count($rows)],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/expired-contracts',
            ...$this->filterOptions->all(),
        ];
    }
}
