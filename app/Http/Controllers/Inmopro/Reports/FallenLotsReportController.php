<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\Concerns\ExportsReportDetail;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use App\Services\Inmopro\Reports\FallenLotsReportQuery;
use App\Services\Inmopro\Reports\LotDetailSerializer;
use App\Services\Inmopro\Reports\ReportFilterOptions;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FallenLotsReportController extends Controller
{
    use ExportsReportDetail;

    public function __construct(
        private readonly FallenLotsReportQuery $fallenQuery,
        private readonly LotDetailSerializer $lotSerializer,
        private readonly ReportFilterOptions $filterOptions,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/fallen', $this->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        return $this->pdfResponse($request, $this->buildPayload($request), 'inmopro.reports.fallen-pdf', 'caidos');
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->buildPayload($request);

        return $this->csvResponse(
            'caidos',
            ['Grupo', 'Cantidad'],
            fn () => array_map(
                fn (array $row) => [$row['label'], (string) $row['count']],
                $payload['aggregates']
            )
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Request $request): array
    {
        $dimension = $this->resolveDimension($request);
        $filters = [
            'dimension' => $dimension,
            'project_id' => $request->filled('project_id') ? $request->integer('project_id') : null,
            'team_id' => $request->filled('team_id') ? $request->integer('team_id') : null,
            'advisor_id' => $request->filled('advisor_id') ? $request->integer('advisor_id') : null,
            'include_inactive' => $request->boolean('include_inactive'),
        ];

        $lots = $this->fallenQuery->lots($request);
        $detailRows = $lots->map(fn (Lot $lot) => $this->lotSerializer->toRow($lot))->values()->all();

        $aggregates = match ($dimension) {
            'project' => $this->aggregateBy($lots, 'project_id', Project::class, 'name'),
            'advisor' => $this->aggregateBy($lots, 'advisor_id', Advisor::class, 'name'),
            default => $this->aggregateByTeam($lots),
        };

        return [
            'title' => 'Caídos (reservas vencidas)',
            'description' => 'Reservas con fecha límite vencida sin transferir, agrupadas por '.$this->dimensionLabel($dimension).'.',
            'criteriaNote' => FallenLotsReportQuery::CRITERIA,
            'filters' => $filters,
            'aggregates' => $aggregates,
            'detail_rows' => $detailRows,
            'summary' => ['total' => count($detailRows)],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'exportBaseUrl' => '/inmopro/reports/fallen',
            ...$this->filterOptions->all($request),
        ];
    }

    private function resolveDimension(Request $request): string
    {
        $dimension = (string) $request->input('dimension', 'team');

        return in_array($dimension, ['team', 'project', 'advisor'], true) ? $dimension : 'team';
    }

    private function dimensionLabel(string $dimension): string
    {
        return match ($dimension) {
            'project' => 'proyecto',
            'advisor' => 'vendedor',
            default => 'equipo',
        };
    }

    /**
     * @param  Collection<int, Lot>  $lots
     * @param  class-string  $modelClass
     * @return list<array<string, mixed>>
     */
    private function aggregateBy($lots, string $foreignKey, string $modelClass, string $nameColumn): array
    {
        $grouped = $lots->groupBy($foreignKey);

        return $grouped->map(function ($group, $id) use ($modelClass, $nameColumn): array {
            $model = $modelClass::query()->find($id);

            return [
                'id' => (int) $id,
                'label' => $model?->{$nameColumn} ?? 'Sin asignar',
                'count' => $group->count(),
            ];
        })->sortByDesc('count')->values()->all();
    }

    /**
     * @param  Collection<int, Lot>  $lots
     * @return list<array<string, mixed>>
     */
    private function aggregateByTeam($lots): array
    {
        $grouped = $lots->groupBy(fn (Lot $lot) => $lot->advisor?->team_id ?? 0);

        return $grouped->map(function ($group, $teamId): array {
            $team = $teamId ? Team::query()->find($teamId) : null;

            return [
                'id' => (int) $teamId,
                'label' => $team?->name ?? 'Sin equipo',
                'count' => $group->count(),
            ];
        })->sortByDesc('count')->values()->all();
    }
}
