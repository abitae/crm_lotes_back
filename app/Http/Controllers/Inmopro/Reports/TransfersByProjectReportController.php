<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\Project;
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
        $payload['tableHeaders'] = ['Proyecto', 'Mes', 'Cantidad', 'Monto'];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['project_name'],
                $row['month_label'].' '.$row['year'],
                (string) $row['transfer_count'],
                number_format((float) $row['transfer_amount'], 2),
            ],
            $payload['rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'transferencias-mensuales');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'transferencias-mensuales',
            ['Proyecto', 'Año', 'Mes', 'Cantidad', 'Monto (S/)'],
            fn () => array_map(
                fn (array $row) => [
                    $row['project_name'],
                    (string) $row['year'],
                    (string) $row['month'],
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
        $yearRange = $this->dateRangeResolver->resolveYear($request);
        $filters = [
            'year' => $yearRange['year'],
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
        ];

        $aggregates = Lot::query()
            ->join('lot_transfer_confirmations as ltc', 'ltc.lot_id', '=', 'lots.id')
            ->join('projects', 'projects.id', '=', 'lots.project_id')
            ->where('ltc.status', LotTransferConfirmation::STATUS_APPROVED)
            ->whereYear('ltc.reviewed_at', $filters['year'])
            ->when($filters['project_id'], fn (Builder $q, int $pid) => $q->where('lots.project_id', $pid))
            ->select(
                'lots.project_id',
                'projects.name as project_name',
                DB::raw('YEAR(ltc.reviewed_at) as year'),
                DB::raw('MONTH(ltc.reviewed_at) as month'),
                DB::raw('COUNT(DISTINCT lots.id) as transfer_count'),
                DB::raw('SUM(lots.price) as transfer_amount')
            )
            ->groupBy('lots.project_id', 'projects.name', DB::raw('YEAR(ltc.reviewed_at)'), DB::raw('MONTH(ltc.reviewed_at)'))
            ->orderBy('projects.name')
            ->orderBy('month')
            ->get();

        $monthNames = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
        ];

        $rows = $aggregates->map(fn ($row) => [
            'project_id' => $row->project_id,
            'project_name' => $row->project_name,
            'year' => (int) $row->year,
            'month' => (int) $row->month,
            'month_label' => $monthNames[(int) $row->month] ?? (string) $row->month,
            'transfer_count' => (int) $row->transfer_count,
            'transfer_amount' => round((float) $row->transfer_amount, 2),
        ])->all();

        return [
            'title' => 'Transferencias por proyecto (mensual)',
            'description' => 'Cantidad y monto de transferencias aprobadas agrupadas por mes.',
            'criteriaNote' => 'Fecha = revisión de confirmación APROBADA.',
            'filters' => $filters,
            'rows' => $rows,
            'summary' => [
                'total_count' => (int) collect($rows)->sum('transfer_count'),
                'total_amount' => round((float) collect($rows)->sum('transfer_amount'), 2),
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/transfers-by-project',
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
        ];
    }
}
