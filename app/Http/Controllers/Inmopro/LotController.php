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
        $projectId = $request->query('project_id');
        $project = $this->resolveActiveProject($projectId ? (int) $projectId : null);

        if (! $project) {
            return Inertia::render('inmopro/inventory', [
                'projects' => $this->activeProjects()
                    ->get()
                    ->map(fn (Project $project): array => $this->projectPayload($project))
                    ->values(),
                'project' => null,
                'lots' => [],
                'lotStatuses' => LotStatus::orderBy('sort_order')->get(),
                'clients' => [],
                'advisors' => [],
            ]);
        }

        $lots = Lot::with(['status', 'client', 'advisor'])
            ->where('project_id', $project->id)
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        $projects = $this->activeProjects()
            ->get()
            ->map(fn (Project $project): array => $this->projectPayload($project))
            ->values();
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
        return Project::query()->active()->orderBy('name');
    }

    private function resolveActiveProject(?int $projectId): ?Project
    {
        if ($projectId) {
            $project = $this->activeProjects()->whereKey($projectId)->first();
            if ($project) {
                return $project;
            }
        }

        return $this->activeProjects()->first();
    }

    /**
     * @return array{id:int,name:string,location:string|null,maps_url:string|null,location_label:string|null,blocks:list<string>}
     */
    private function projectPayload(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'location' => $project->location,
            'maps_url' => $this->locationMapsResolver->resolveMapsUrl($project->location),
            'location_label' => $this->locationMapsResolver->displayLabel($project->location),
            'blocks' => array_values($project->blocks ?? []),
        ];
    }
}
