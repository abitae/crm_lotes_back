<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\Reports\LotReportQueryBuilder;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectInventoryReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly LotReportQueryBuilder $lotQueryBuilder,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/project-inventory', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->buildPayload($request);
        $payload['tableHeaders'] = ['Proyecto', 'Libres', 'Reservados', 'Transferidos', 'Total'];
        $payload['tableBody'] = array_map(
            fn (array $row) => [
                $row['project_name'],
                (string) $row['libre_count'],
                (string) $row['reservado_count'],
                (string) $row['transferido_count'],
                (string) $row['total_count'],
            ],
            $payload['rows']
        );

        return $this->pdfResponse($request, $payload, 'inmopro.reports.detail-pdf', 'inventario-proyectos');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'inventario-proyectos',
            ['Proyecto', 'Libres', 'Reservados', 'Transferidos', 'Total', 'Monto reservado', 'Monto transferido'],
            fn () => array_map(
                fn (array $row) => [
                    $row['project_name'],
                    (string) $row['libre_count'],
                    (string) $row['reservado_count'],
                    (string) $row['transferido_count'],
                    (string) $row['total_count'],
                    number_format((float) $row['reservado_amount'], 2, '.', ''),
                    number_format((float) $row['transferido_amount'], 2, '.', ''),
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
        $clientOrigin = (string) $request->input('client_origin', 'all');
        $filters = [
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'client_origin' => $clientOrigin,
        ];

        $statusIds = LotStatus::query()
            ->whereIn('code', [
                LotStatus::CODE_LIBRE,
                LotStatus::CODE_RESERVADO,
                LotStatus::CODE_TRANSFERIDO,
            ])
            ->pluck('id', 'code');

        $projects = Project::query()
            ->when($filters['project_id'], fn (Builder $q, int $id) => $q->where('id', $id))
            ->orderBy('name')
            ->get(['id', 'name']);

        $rows = $projects->map(function (Project $project) use ($statusIds, $clientOrigin): array {
            $base = Lot::query()->where('project_id', $project->id);

            $libreCount = (clone $base)->where('lot_status_id', $statusIds[LotStatus::CODE_LIBRE] ?? 0)->count();

            $nonLibre = (clone $base)->where('lot_status_id', '!=', $statusIds[LotStatus::CODE_LIBRE] ?? 0);
            if ($clientOrigin !== 'all') {
                $this->lotQueryBuilder->applyClientOriginFilter($nonLibre, $clientOrigin);
            }

            $reservadoId = $statusIds[LotStatus::CODE_RESERVADO] ?? null;
            $transferidoId = $statusIds[LotStatus::CODE_TRANSFERIDO] ?? null;

            $reservadoCount = $reservadoId
                ? (clone $nonLibre)->where('lot_status_id', $reservadoId)->count()
                : 0;
            $transferidoCount = $transferidoId
                ? (clone $nonLibre)->where('lot_status_id', $transferidoId)->count()
                : 0;

            $reservadoAmount = $reservadoId
                ? (float) (clone $nonLibre)->where('lot_status_id', $reservadoId)->sum('price')
                : 0.0;
            $transferidoAmount = $transferidoId
                ? (float) (clone $nonLibre)->where('lot_status_id', $transferidoId)->sum('price')
                : 0.0;

            return [
                'id' => $project->id,
                'project_name' => $project->name,
                'libre_count' => $libreCount,
                'reservado_count' => $reservadoCount,
                'transferido_count' => $transferidoCount,
                'total_count' => $libreCount + $reservadoCount + $transferidoCount,
                'reservado_amount' => round($reservadoAmount, 2),
                'transferido_amount' => round($transferidoAmount, 2),
            ];
        })->filter(fn (array $row) => $row['total_count'] > 0)->values()->all();

        return [
            'title' => 'Inventario comercial por proyecto',
            'description' => 'Conteo de lotes por estado. Los libres no aplican filtro de origen de cliente.',
            'criteriaNote' => 'Propio = tipo PROPIO. Tercero = tipo DATERO o captado por datero.',
            'filters' => $filters,
            'rows' => $rows,
            'summary' => [
                'libre' => (int) collect($rows)->sum('libre_count'),
                'reservado' => (int) collect($rows)->sum('reservado_count'),
                'transferido' => (int) collect($rows)->sum('transferido_count'),
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/project-inventory',
            ...$this->filterOptions->all(),
        ];
    }
}
