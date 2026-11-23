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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Pagination\LengthAwarePaginator;
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
        $payload = $this->buildPayload($request);
        $rows = collect($payload['rows'])->values();
        $perPage = 15;
        $page = max(1, $request->integer('page', 1));
        $paginator = new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );

        $payload['rows'] = array_values($paginator->items());
        $payload['pagination'] = [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'total' => $paginator->total(),
            'links' => $paginator->linkCollection()->toArray(),
        ];

        return Inertia::render('inmopro/reports/top-advisors', $payload);
    }

    public function transfers(Request $request, Advisor $advisor): JsonResponse
    {
        $filters = $this->filters($request);

        $transfers = $this->transferredLotsQuery($filters)
            ->leftJoin('clients', 'clients.id', '=', 'lots.client_id')
            ->where('lots.advisor_id', $advisor->id)
            ->select([
                'lots.id',
                'lots.block',
                'lots.number',
                'lots.price',
                'lots.notarial_transfer_date',
                DB::raw('COALESCE(clients.name, lots.client_name) as client_name'),
                'projects.name as project_name',
                DB::raw('ROUND(lots.price * COALESCE(project_types.percentage_meta, 100) / 100, 2) as transfer_amount'),
            ])
            ->orderBy('lots.notarial_transfer_date')
            ->orderBy('lots.block')
            ->orderBy('lots.number')
            ->get()
            ->map(fn (Lot $lot): array => [
                'id' => $lot->id,
                'project_name' => $lot->getAttribute('project_name'),
                'block' => $lot->block,
                'number' => $lot->number,
                'client_name' => $lot->getAttribute('client_name'),
                'notarial_transfer_date' => $lot->notarial_transfer_date?->toDateString(),
                'price' => round((float) $lot->price, 2),
                'transfer_amount' => round((float) $lot->getAttribute('transfer_amount'), 2),
            ])
            ->values();

        return response()->json([
            'advisor' => [
                'id' => $advisor->id,
                'name' => $advisor->name,
            ],
            'transfers' => $transfers,
        ]);
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
     * @return array{project_id: int|null, team_id: int|null, start_date: string, end_date: string, include_inactive: bool}
     */
    private function filters(Request $request): array
    {
        $dateRange = $this->dateRangeResolver->resolve($request);

        return [
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
            'include_inactive' => $request->boolean('include_inactive'),
        ];
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
        $filters = $this->filters($request);

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
            ->map(function (array $row, int $index): array {
                $row['rank'] = $index + 1;

                return $row;
            })
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
