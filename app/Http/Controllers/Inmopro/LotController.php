<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreLotRequest;
use App\Http\Requests\Inmopro\UpdateLotRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\LotPersistService;
use App\Services\Inmopro\ProjectLocationMapsResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\View;
use Inertia\Inertia;
use Inertia\Response;
use Mpdf\Mpdf;

class LotController extends Controller
{
    public function __construct(
        private LotPersistService $lotPersistService,
        private ProjectLocationMapsResolver $locationMapsResolver,
    ) {}

    public function index(Request $request): Response
    {
        $includeInactive = $request->boolean('include_inactive');
        $projectId = $request->query('project_id');
        $project = $this->resolveProject(
            $projectId ? (int) $projectId : null,
            $includeInactive
        );

        $projects = $this->projectsQuery($includeInactive)
            ->get()
            ->map(fn (Project $item): array => $this->projectPayload($item))
            ->values();

        if (! $project) {
            return Inertia::render('inmopro/inventory', [
                'projects' => $projects,
                'project' => null,
                'lots' => [],
                'lotStatuses' => LotStatus::orderBy('sort_order')->get(),
                'clients' => [],
                'advisors' => [],
                'filters' => [
                    'include_inactive' => $includeInactive,
                ],
            ]);
        }

        $lots = Lot::with(['status', 'client', 'advisor'])
            ->where('project_id', $project->id)
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        $lotStatuses = LotStatus::orderBy('sort_order')->get();
        $clients = Client::orderBy('name')->get(['id', 'name', 'dni', 'phone', 'email']);
        $advisors = Advisor::with('level')->orderBy('name')->get();

        return Inertia::render('inmopro/inventory', [
            'projects' => $projects,
            'project' => $this->projectPayload($project),
            'lots' => $lots,
            'lotStatuses' => $lotStatuses,
            'clients' => $clients,
            'advisors' => $advisors,
            'filters' => [
                'include_inactive' => $includeInactive,
            ],
        ]);
    }

    public function update(UpdateLotRequest $request, Lot $lot): RedirectResponse
    {
        $this->lotPersistService->update($lot, $request->validated());

        return back();
    }

    public function create(Request $request): Response
    {
        $projectId = $request->query('project_id');
        $project = $projectId ? $this->resolveActiveProject((int) $projectId) : null;
        $lotStatuses = LotStatus::orderBy('sort_order')->get();
        $clients = Client::orderBy('name')->get(['id', 'name', 'dni', 'phone', 'email']);
        $advisors = Advisor::with('level')->orderBy('name')->get();
        $projects = $this->activeProjects()->get();

        return Inertia::render('inmopro/lots/create', [
            'projects' => $projects,
            'project' => $project,
            'lotStatuses' => $lotStatuses,
            'clients' => $clients,
            'advisors' => $advisors,
        ]);
    }

    public function store(StoreLotRequest $request): RedirectResponse
    {
        $validated = $this->lotPersistService->prepareForStore($request->validated());
        $lot = Lot::create($validated);

        return redirect()->route('inmopro.lots.index', ['project_id' => $lot->project_id]);
    }

    public function exportPdf(Request $request): HttpResponse
    {
        $projectId = $request->query('project_id');
        $project = $this->resolveActiveProject($projectId ? (int) $projectId : null);
        if (! $project) {
            abort(404, 'Proyecto no encontrado');
        }

        $lots = Lot::with('status')
            ->where('project_id', $project->id)
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        $blockGroups = $lots->groupBy('block');

        $html = View::make('inmopro.lots-export-pdf', [
            'project' => $project,
            'blockGroups' => $blockGroups,
        ])->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 12,
            'margin_right' => 12,
            'margin_top' => 16,
            'margin_bottom' => 16,
        ]);
        $mpdf->WriteHTML($html);
        $pdf = $mpdf->Output('', 'S');

        $filename = 'inventario-lotes-'.str($project->name)->slug().'-'.now()->format('Y-m-d').'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function show(Lot $lot): Response
    {
        $lot->load([
            'project',
            'status',
            'client',
            'advisor',
            'commissions',
            'expenses.creator',
            'latestTransferConfirmation.requester',
            'latestTransferConfirmation.reviewer',
        ]);

        return Inertia::render('inmopro/lots/show', [
            'lot' => $lot,
            'financialMetrics' => $lot->financialMetrics(),
            'canConfirmTransfer' => request()->user()?->can('inmopro.lots.transfer-confirmation') ?? false,
            'canManageFinancials' => request()->user()?->can('inmopro.lots.financial.update') ?? false,
            'canManageExpenses' => request()->user()?->can('inmopro.lots.expenses.store') ?? false,
        ]);
    }

    public function edit(Lot $lot): Response
    {
        $lot->load(['project', 'status', 'client', 'advisor']);
        $lotStatuses = LotStatus::orderBy('sort_order')->get();
        $clients = Client::orderBy('name')->get(['id', 'name', 'dni', 'phone', 'email']);
        $advisors = Advisor::with('level')->orderBy('name')->get();
        $projects = $this->activeProjects()->get();

        return Inertia::render('inmopro/lots/edit', [
            'lot' => $lot,
            'lotStatuses' => $lotStatuses,
            'clients' => $clients,
            'advisors' => $advisors,
            'projects' => $projects,
        ]);
    }

    public function destroy(Lot $lot): RedirectResponse
    {
        $projectId = $lot->project_id;
        $lot->delete();

        return redirect()->route('inmopro.lots.index', ['project_id' => $projectId]);
    }

    /**
     * @return Builder<Project>
     */
    private function activeProjects(): Builder
    {
        return $this->projectsQuery(false);
    }

    /**
     * @return Builder<Project>
     */
    private function projectsQuery(bool $includeInactive): Builder
    {
        return Project::query()
            ->withCount('flatPolygons')
            ->when(! $includeInactive, fn (Builder $query) => $query->active())
            ->when($includeInactive, fn (Builder $query) => $query->orderByDesc('is_active'))
            ->orderBy('name');
    }

    private function resolveActiveProject(?int $projectId): ?Project
    {
        return $this->resolveProject($projectId, false);
    }

    private function resolveProject(?int $projectId, bool $includeInactive): ?Project
    {
        $query = $this->projectsQuery($includeInactive);

        if ($projectId) {
            $project = (clone $query)->whereKey($projectId)->first();
            if ($project) {
                return $project;
            }
        }

        return $query->first();
    }

    /**
     * @return array{id:int,name:string,is_active:bool,location:string|null,maps_url:string|null,location_label:string|null,blocks:list<string>,view_360_url:string|null,view_flat_url:string|null}
     */
    private function projectPayload(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'is_active' => (bool) $project->is_active,
            'location' => $project->location,
            'maps_url' => $this->locationMapsResolver->resolveMapsUrl($project->location),
            'location_label' => $this->locationMapsResolver->displayLabel($project->location),
            'blocks' => array_values($project->blocks ?? []),
            'view_360_url' => $project->tour_360_url,
            'view_flat_url' => $project->resolveViewFlatUrl(),
        ];
    }
}
