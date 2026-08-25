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

class LotsAdvancedReportController extends Controller
{
    use ExportsReportDetail;

    private const SCOPES = ['libre', 'reservado', 'caidos', 'cuotas', 'todos'];

    public function __construct(
        private readonly ReportDateRangeResolver $dateRangeResolver,
        private readonly LotReportQueryBuilder $lotQueryBuilder,
        private readonly LotDetailSerializer $lotSerializer,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/lots-advanced', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request, forExport: true);
        $payload['tableHeaders'] = [
            'Cliente', 'Ciudad', 'Celular', 'Proyecto', 'MZ', 'Lote', 'Estado', 'Monto', 'Cazador', 'Equipo', 'F. contrato', 'F. límite',
        ];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['client_name'] ?? '',
                $row['city_name'] ?? '',
                $row['client_phone'] ?? '',
                $row['project_name'] ?? '',
                $row['block'] ?? '',
                (string) ($row['number'] ?? ''),
                $row['status_name'] ?? '',
                number_format((float) ($row['price'] ?? 0), 2),
                $row['advisor_name'] ?? '',
                $row['team_name'] ?? '',
                $row['contract_date'] ?? '',
                $row['payment_limit_date'] ?? '',
            ],
            $payload['rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'inventario-avanzado');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request, forExport: true);

        return $this->csvResponse(
            'inventario-avanzado',
            [
                'Cliente', 'Ciudad', 'Celular', 'Proyecto', 'MZ', 'Lote', 'Estado',
                'Monto (S/)', 'Cazador', 'Equipo', 'Fecha contrato', 'Fecha límite',
            ],
            fn () => array_map(
                fn (array $row) => [
                    $row['client_name'] ?? '',
                    $row['city_name'] ?? '',
                    $row['client_phone'] ?? '',
                    $row['project_name'] ?? '',
                    $row['block'] ?? '',
                    (string) ($row['number'] ?? ''),
                    $row['status_name'] ?? '',
                    number_format((float) ($row['price'] ?? 0), 2, '.', ''),
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
        $scope = $this->resolveScope($request);
        $applyDates = $request->exists('apply_dates')
            ? $request->boolean('apply_dates')
            : ($scope !== 'libre' && $scope !== 'caidos');

        $filters = [
            'scope' => $scope,
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'advisor_id' => $request->filled('advisor_id') ? $request->integer('advisor_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'client_search' => trim((string) $request->input('client_search', '')) ?: null,
            'start_date' => $dateRange['start_date'],
            'end_date' => $dateRange['end_date'],
            'apply_dates' => $applyDates,
            'include_inactive' => $request->boolean('include_inactive'),
        ];

        $query = $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->applyCommonFilters($q, $request));

        $this->applyScope($query, $scope);

        if ($applyDates) {
            $this->applyDateFilter($query, $scope, $filters['start_date'], $filters['end_date']);
        }

        $query
            ->orderBy('project_id')
            ->orderBy('block')
            ->orderBy('number');

        $statusBreakdown = $this->statusBreakdown(clone $query);
        $total = (clone $query)->withoutEagerLoads()->count();
        $totalAmount = round(
            (float) (clone $query)->withoutEagerLoads()->sum(\Illuminate\Support\Facades\DB::raw('COALESCE(sale_price, price, 0)')),
            2
        );

        if ($forExport) {
            $lots = $query->get();
            $rows = $lots->map(fn ($lot) => $this->lotSerializer->toRow($lot))->all();
            $pagination = null;
        } else {
            $paginator = $query->paginate(40)->withQueryString();
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
            'title' => 'Inventario avanzado de lotes',
            'description' => 'Detalle de lotes libres, reservados, caídos y en cuotas con filtros comerciales.',
            'criteriaNote' => $this->criteriaNote($scope, $applyDates),
            'filters' => $filters,
            'rows' => $rows,
            'pagination' => $pagination,
            'summary' => [
                'total' => $total,
                'total_amount' => $totalAmount,
                'by_status' => $statusBreakdown,
            ],
            'scopes' => [
                ['value' => 'libre', 'label' => 'Libres'],
                ['value' => 'reservado', 'label' => 'Reservados'],
                ['value' => 'caidos', 'label' => 'Caídos'],
                ['value' => 'cuotas', 'label' => 'Cuotas'],
                ['value' => 'todos', 'label' => 'Todos (activos)'],
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/lots-advanced',
            ...$this->filterOptions->all($request),
        ];
    }

    private function resolveScope(Request $request): string
    {
        $scope = (string) $request->input('scope', 'reservado');

        return in_array($scope, self::SCOPES, true) ? $scope : 'reservado';
    }

    /**
     * @param  Builder<\App\Models\Inmopro\Lot>  $query
     */
    private function applyScope(Builder $query, string $scope): void
    {
        match ($scope) {
            'libre' => $this->lotQueryBuilder->whereStatusCode($query, LotStatus::CODE_LIBRE),
            'reservado' => $this->lotQueryBuilder->whereStatusCode($query, LotStatus::CODE_RESERVADO),
            'cuotas' => $this->lotQueryBuilder->whereStatusCode($query, LotStatus::CODE_CUOTAS),
            'caidos' => $query
                ->tap(fn (Builder $q) => $this->lotQueryBuilder->whereStatusCode($q, LotStatus::CODE_RESERVADO))
                ->whereNotNull('payment_limit_date')
                ->whereDate('payment_limit_date', '<', now()->toDateString()),
            default => $query->whereHas(
                'status',
                fn (Builder $statusQuery) => $statusQuery->whereIn('code', [
                    LotStatus::CODE_LIBRE,
                    LotStatus::CODE_RESERVADO,
                    LotStatus::CODE_CUOTAS,
                    LotStatus::CODE_PRERESERVA,
                ])
            ),
        };
    }

    /**
     * @param  Builder<\App\Models\Inmopro\Lot>  $query
     */
    private function applyDateFilter(Builder $query, string $scope, string $start, string $end): void
    {
        match ($scope) {
            'libre' => $query
                ->whereDate('lots.created_at', '>=', $start)
                ->whereDate('lots.created_at', '<=', $end),
            'caidos' => $query
                ->whereDate('payment_limit_date', '>=', $start)
                ->whereDate('payment_limit_date', '<=', $end),
            'cuotas' => $query->where(function (Builder $dateQuery) use ($start, $end): void {
                $dateQuery
                    ->where(function (Builder $contract) use ($start, $end): void {
                        $contract
                            ->whereNotNull('contract_date')
                            ->whereDate('contract_date', '>=', $start)
                            ->whereDate('contract_date', '<=', $end);
                    })
                    ->orWhere(function (Builder $transfer) use ($start, $end): void {
                        $transfer
                            ->whereNotNull('notarial_transfer_date')
                            ->whereDate('notarial_transfer_date', '>=', $start)
                            ->whereDate('notarial_transfer_date', '<=', $end);
                    });
            }),
            default => $query
                ->whereNotNull('contract_date')
                ->whereDate('contract_date', '>=', $start)
                ->whereDate('contract_date', '<=', $end),
        };
    }

    private function criteriaNote(string $scope, bool $applyDates): string
    {
        $base = match ($scope) {
            'libre' => 'Estado LIBRE.',
            'reservado' => 'Estado RESERVADO.',
            'caidos' => 'RESERVADO con fecha límite de pago vencida.',
            'cuotas' => 'Estado CUOTAS.',
            default => 'Libres, reservados, pre-reservas y cuotas.',
        };

        if (! $applyDates) {
            return $base.' Sin filtro de fechas.';
        }

        $dateField = match ($scope) {
            'libre' => 'fecha de creación',
            'caidos' => 'fecha límite de pago',
            'cuotas' => 'fecha de contrato o escritura',
            default => 'fecha de contrato',
        };

        return $base." Filtro de fechas sobre {$dateField}.";
    }

    /**
     * @param  Builder<\App\Models\Inmopro\Lot>  $query
     * @return list<array{code: string, name: string, count: int}>
     */
    private function statusBreakdown(Builder $query): array
    {
        $counts = (clone $query)
            ->withoutEagerLoads()
            ->reorder()
            ->select('lot_status_id')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('lot_status_id')
            ->pluck('aggregate', 'lot_status_id');

        $statuses = LotStatus::query()->whereIn('id', $counts->keys())->get(['id', 'name', 'code'])->keyBy('id');

        return $counts
            ->map(function ($count, $statusId) use ($statuses): array {
                $status = $statuses->get($statusId);

                return [
                    'code' => $status?->code ?? 'N/A',
                    'name' => $status?->name ?? 'Sin estado',
                    'count' => (int) $count,
                ];
            })
            ->sortByDesc('count')
            ->values()
            ->all();
    }
}
