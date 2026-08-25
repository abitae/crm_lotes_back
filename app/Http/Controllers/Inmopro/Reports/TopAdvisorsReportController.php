<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Services\Inmopro\Reports\ReportDateRangeResolver;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Mpdf\Mpdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TopAdvisorsReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly ReportDateRangeResolver $dateRangeResolver,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/top-advisors', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request);
        $html = View::make('inmopro.reports.top-advisors-pdf', $payload)->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4-L',
            'margin_left' => 8,
            'margin_right' => 8,
            'margin_top' => 10,
            'margin_bottom' => 10,
        ]);
        $mpdf->WriteHTML($html);
        $pdf = $mpdf->Output('', 'S');

        $filename = 'top-cazadores-'.now()->format('Y-m-d').'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
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
     * @param  array{project_id: int|null, team_id: int|null, start_date: string, end_date: string, include_inactive?: bool}  $filters
     * @return Builder<Lot>
     */
    private function transferredLotsQuery(array $filters): Builder
    {
        return Lot::query()
            ->join('projects', 'projects.id', '=', 'lots.project_id')
            ->leftJoin('project_types', 'project_types.id', '=', 'projects.project_type_id')
            ->whereHas('status', fn (Builder $query) => $query->where('code', LotStatus::CODE_TRANSFERIDO))
            ->when(! ($filters['include_inactive'] ?? false), fn (Builder $query) => $query->where('projects.is_active', true))
            ->when($filters['project_id'], fn (Builder $query, int $projectId) => $query->where('lots.project_id', $projectId))
            ->when($filters['team_id'], fn (Builder $query, int $teamId) => $query->whereHas(
                'advisor',
                fn (Builder $advisorQuery) => $advisorQuery->where('team_id', $teamId)
            ))
            ->whereDate('lots.notarial_transfer_date', '>=', $filters['start_date'])
            ->whereDate('lots.notarial_transfer_date', '<=', $filters['end_date'])
            ->whereNotNull('lots.advisor_id')
            ->whereNotNull('lots.notarial_transfer_date');
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
            'include_inactive' => $request->boolean('include_inactive'),
        ];

        $options = $this->filterOptions->all($request);

        $advisors = Advisor::query()
            ->with('team:id,name,color')
            ->when($filters['team_id'], fn (Builder $query, int $teamId) => $query->where('team_id', $teamId))
            ->orderBy('name')
            ->get(['id', 'name', 'team_id']);

        $statsByAdvisor = $this->transferredLotsQuery($filters)
            ->select(
                'lots.advisor_id',
                DB::raw('COUNT(*) as transfer_count'),
                DB::raw('SUM(lots.price * COALESCE(project_types.percentage_meta, 100) / 100) as transfer_amount')
            )
            ->groupBy('lots.advisor_id')
            ->get()
            ->keyBy('advisor_id');

        $rows = $advisors->map(function (Advisor $advisor) use ($statsByAdvisor): array {
            $stats = $statsByAdvisor->get($advisor->id);
            $amount = round((float) ($stats->transfer_amount ?? 0), 2);

            return [
                'id' => $advisor->id,
                'advisor_name' => $advisor->name,
                'team_name' => $advisor->team?->name,
                'color' => $advisor->team?->color,
                'sold_amount' => $amount,
                'transfer_count' => (int) ($stats->transfer_count ?? 0),
                'transfer_amount' => $amount,
            ];
        })
            ->filter(fn (array $row) => $row['transfer_count'] > 0)
            ->sortByDesc('sold_amount')
            ->values()
            ->all();

        return [
            'title' => 'Top cazadores (vendedores)',
            'description' => 'Ranking por lotes transferidos según fecha de escritura. Monto = precio del lote × % meta del tipo de proyecto.',
            'criteriaNote' => 'Solo lotes en estado transferido. Periodo según fecha de escritura. Monto ponderado por el % meta configurado en tipos de proyecto.',
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
