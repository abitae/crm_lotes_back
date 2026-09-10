<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\ProjectWithLotsTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\BulkUpdateProjectLotsRequest;
use App\Http\Requests\Inmopro\ImportProjectConfirmRequest;
use App\Http\Requests\Inmopro\ImportProjectPreviewRequest;
use App\Http\Requests\Inmopro\StoreProjectRequest;
use App\Http\Requests\Inmopro\UpdateProjectRequest;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Models\Inmopro\ProjectType;
use App\Services\Inmopro\LotPersistService;
use App\Services\Inmopro\ProjectAssetStorageService;
use App\Services\Inmopro\ProjectLocationMapsResolver;
use App\Services\Inmopro\ProjectsExcelImportService;
use App\Support\ClientPhoneGuard;
use App\Support\FileStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectController extends Controller
{
    public function __construct(
        private LotPersistService $lotPersistService,
        private ProjectAssetStorageService $projectAssetStorage,
        private ProjectLocationMapsResolver $locationMapsResolver,
    ) {}

    public function index(Request $request): Response
    {
        $query = Project::query()
            ->with('projectType')
            ->withCount('lots')
            ->withCount([
                'lots as free_lots_count' => fn (Builder $builder) => $builder->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('code', 'LIBRE')),
                'lots as pre_reserved_lots_count' => fn (Builder $builder) => $builder->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('code', 'PRERESERVA')),
                'lots as reserved_lots_count' => fn (Builder $builder) => $builder->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('code', 'RESERVADO')),
                'lots as transferred_lots_count' => fn (Builder $builder) => $builder->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('code', 'TRANSFERIDO')),
                'lots as installments_lots_count' => fn (Builder $builder) => $builder->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('code', 'CUOTAS')),
            ])
            ->withSum('lots as portfolio_value', 'price')
            ->withSum('lots as receivable_balance', 'remaining_balance');

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(function (Builder $builder) use ($term): void {
                $builder->where('name', 'like', "%{$term}%")
                    ->orWhere('location', 'like', "%{$term}%");
            });
        }

        if ($request->filled('location')) {
            $query->where('location', (string) $request->input('location'));
        }

        if ($request->filled('project_type_id')) {
            $query->where('project_type_id', (int) $request->input('project_type_id'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('health')) {
            match ((string) $request->input('health')) {
                'with_stock' => $query->whereHas('lots.status', fn (Builder $builder) => $builder->where('code', 'LIBRE')),
                'sold_out' => $query->whereDoesntHave('lots.status', fn (Builder $builder) => $builder->where('code', 'LIBRE')),
                'inconsistent' => $query->whereRaw('(select count(*) from lots where lots.project_id = projects.id) <> COALESCE(total_lots, 0)'),
                default => null,
            };
        }

        $query->orderByDesc('is_active');

        match ((string) $request->input('order')) {
            'lots_desc' => $query->orderByDesc('lots_count')->orderBy('name'),
            'balance_desc' => $query->orderByDesc('receivable_balance')->orderBy('name'),
            'value_desc' => $query->orderByDesc('portfolio_value')->orderBy('name'),
            'availability_desc' => $query->orderByDesc('free_lots_count')->orderBy('name'),
            default => $query->orderBy('name'),
        };

        $projects = $query->paginate(15)->withQueryString()->through(function (Project $project): array {
            $plannedLots = $project->total_lots ?? 0;
            $actualLots = $project->lots_count ?? 0;
            $soldLots = ($project->reserved_lots_count ?? 0) + ($project->transferred_lots_count ?? 0) + ($project->installments_lots_count ?? 0);
            $occupancyRate = $actualLots > 0 ? round(($soldLots / $actualLots) * 100, 1) : 0.0;

            return [
                'id' => $project->id,
                'name' => $project->name,
                'project_type_id' => $project->project_type_id,
                'project_type' => $project->projectType ? [
                    'id' => $project->projectType->id,
                    'name' => $project->projectType->name,
                    'code' => $project->projectType->code,
                ] : null,
                'location' => $project->location,
                'maps_url' => $this->locationMapsResolver->resolveMapsUrl($project->location),
                'location_label' => $this->locationMapsResolver->displayLabel($project->location),
                'total_lots' => $project->total_lots,
                'blocks' => $project->blocks,
                'lots_count' => $actualLots,
                'free_lots_count' => $project->free_lots_count ?? 0,
                'pre_reserved_lots_count' => $project->pre_reserved_lots_count ?? 0,
                'reserved_lots_count' => $project->reserved_lots_count ?? 0,
                'transferred_lots_count' => $project->transferred_lots_count ?? 0,
                'installments_lots_count' => $project->installments_lots_count ?? 0,
                'portfolio_value' => (float) ($project->portfolio_value ?? 0),
                'receivable_balance' => (float) ($project->receivable_balance ?? 0),
                'occupancy_rate' => $occupancyRate,
                'consistency_gap' => $plannedLots - $actualLots,
                'is_consistent' => $plannedLots === $actualLots,
                'blocks_count' => count($project->blocks ?? []),
                'is_active' => (bool) $project->is_active,
            ];
        });

        $projectCollection = $projects->getCollection();

        return Inertia::render('inmopro/projects/index', [
            'projects' => $projects,
            'filters' => [
                'search' => $request->input('search'),
                'project_type_id' => $request->input('project_type_id'),
                'location' => $request->input('location'),
                'health' => $request->input('health'),
                'order' => $request->input('order'),
                'is_active' => $request->input('is_active'),
            ],
            'projectTypes' => ProjectType::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'locations' => Project::query()
                ->whereNotNull('location')
                ->where('location', '!=', '')
                ->orderBy('location')
                ->distinct()
                ->pluck('location')
                ->map(fn (string $location): array => [
                    'value' => $location,
                    'label' => $this->locationMapsResolver->displayLabel($location) ?? $location,
                ])
                ->values()
                ->all(),
            'summary' => [
                'totalProjects' => $projects->total(),
                'totalLots' => $projectCollection->sum('lots_count'),
                'totalFreeLots' => $projectCollection->sum('free_lots_count'),
                'totalBalance' => round((float) $projectCollection->sum('receivable_balance'), 2),
                'inconsistentProjects' => $projectCollection->where('is_consistent', false)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('inmopro/projects/create', [
            'projectTypes' => ProjectType::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'cities' => $this->activeCitiesForSelect(),
        ]);
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $projectData = $this->projectData($validated);

        DB::transaction(function () use ($projectData, $request): void {
            $project = Project::create($projectData);
            $this->syncPortada($project, $request);
            $this->storeAssets($project, $request);
        });

        return redirect()->route('inmopro.projects.index');
    }

    public function show(Project $project): Response
    {
        $project->load([
            'lots' => fn ($query) => $query
                ->with(['status', 'client', 'advisor'])
                ->orderBy('block')
                ->orderBy('number'),
            'assets',
        ]);

        return Inertia::render('inmopro/projects/show', [
            'project' => $this->projectPayload($project, true),
            'lotStatuses' => LotStatus::orderBy('sort_order')->get(),
        ]);
    }

    public function inventory(Project $project): Response
    {
        $project->load([
            'lots' => fn ($query) => $query
                ->with(['status', 'client', 'advisor'])
                ->orderBy('block')
                ->orderBy('number'),
        ]);

        return Inertia::render('inmopro/projects/inventory', [
            'project' => $this->projectPayload($project, true),
            'lotStatuses' => LotStatus::orderBy('sort_order')->get(),
        ]);
    }

    public function bulkUpdateLots(BulkUpdateProjectLotsRequest $request, Project $project): RedirectResponse
    {
        $lotsPayload = $request->validated('lots');
        $count = count($lotsPayload);

        DB::transaction(function () use ($lotsPayload, $project): void {
            foreach ($lotsPayload as $lotData) {
                $lotId = (int) $lotData['id'];
                unset($lotData['id']);

                $lot = Lot::query()
                    ->where('project_id', $project->id)
                    ->findOrFail($lotId);

                $this->lotPersistService->update($lot, $lotData);
            }
        });

        $message = $count === 1
            ? '1 lote actualizado correctamente.'
            : "{$count} lotes actualizados correctamente.";

        return back()->with('success', $message);
    }

    public function edit(Project $project): Response
    {
        $project->load('assets');

        return Inertia::render('inmopro/projects/edit', [
            'project' => $this->projectPayload($project),
            'projectTypes' => ProjectType::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'cities' => $this->activeCitiesForSelect(),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $validated = $request->validated();
        $projectData = $this->projectData($validated);

        DB::transaction(function () use ($project, $projectData, $request): void {
            $project->update($projectData);
            $this->syncPortada($project, $request);
            $this->storeAssets($project, $request);
        });

        return redirect()->route('inmopro.projects.index');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->load('assets');
        $this->deletePortadaFile($project);
        foreach ($project->assets as $asset) {
            FileStorage::deleteIfExists($asset->file_path);
        }
        $project->delete();

        return redirect()->route('inmopro.projects.index');
    }

    public function toggleActive(Project $project): RedirectResponse
    {
        $activating = ! $project->is_active;
        $project->update(['is_active' => $activating]);

        $message = $activating
            ? 'Proyecto activado correctamente.'
            : 'Proyecto desactivado correctamente.';

        return back()->with('success', $message);
    }

    public function downloadAsset(Project $project, ProjectAsset $asset): StreamedResponse
    {
        abort_unless($asset->project_id === $project->id, 404);

        return FileStorage::filesystem()->download($asset->file_path, $asset->file_name);
    }

    public function destroyAsset(Project $project, ProjectAsset $asset): RedirectResponse
    {
        abort_unless($asset->project_id === $project->id, 404);

        FileStorage::deleteIfExists($asset->file_path);
        $asset->delete();

        return back()->with('success', 'Adjunto eliminado correctamente.');
    }

    public function excelTemplate(): BinaryFileResponse
    {
        return Excel::download(
            new ProjectWithLotsTemplateExport,
            'plantilla_proyecto_lotes.xlsx'
        );
    }

    public function importPreview(ImportProjectPreviewRequest $request, ProjectsExcelImportService $importService): JsonResponse
    {
        try {
            return response()->json(
                $importService->preview(
                    $request->file('file'),
                    (int) $request->validated('project_type_id'),
                    (string) $request->validated('location'),
                    $request->validated('name')
                )
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'can_import' => false,
            ], 422);
        } catch (\Throwable $e) {
            report($e);

            $hint = str_contains(strtolower($e->getMessage()), 'structured reference')
                || str_contains(strtolower($e->getMessage()), 'tabla')
                ? ' El archivo tiene formulas o tablas de Excel (por ejemplo en la columna MONTO RESTANTE). Copie los datos y peguelos como valores usando la plantilla oficial.'
                : '';

            return response()->json([
                'message' => 'No se pudo leer el archivo Excel.'.$hint,
                'can_import' => false,
            ], 422);
        }
    }

    public function importConfirm(ImportProjectConfirmRequest $request, ProjectsExcelImportService $importService): RedirectResponse
    {
        try {
            $project = $importService->confirm($request->validated('token'), $request->user());
        } catch (RuntimeException $e) {
            return redirect()
                ->route('inmopro.projects.index')
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('inmopro.projects.show', $project)
            ->with('success', 'Proyecto y lotes importados correctamente.');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function projectData(array $validated): array
    {
        unset(
            $validated['image_files'],
            $validated['video_files'],
            $validated['document_files'],
            $validated['document_titles'],
            $validated['portada_file'],
            $validated['remove_portada'],
        );

        if (array_key_exists('is_web', $validated)) {
            $validated['is_web'] = (bool) $validated['is_web'];
        } else {
            $validated['is_web'] = false;
        }

        if (array_key_exists('is_active', $validated)) {
            $validated['is_active'] = (bool) $validated['is_active'];
        } else {
            $validated['is_active'] = true;
        }

        return $validated;
    }

    private function storeAssets(Project $project, Request $request): void
    {
        $nextSortOrder = ((int) $project->assets()->max('sort_order')) + 1;

        foreach (($request->file('image_files') ?? []) as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $this->createAsset($project, $file, 'image', $nextSortOrder++);
        }

        foreach (($request->file('video_files') ?? []) as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $this->createAsset($project, $file, 'video', $nextSortOrder++);
        }

        foreach (($request->file('document_files') ?? []) as $index => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $title = trim((string) ($request->input('document_titles')[$index] ?? ''));

            $this->createAsset($project, $file, 'document', $nextSortOrder++, $title);
        }
    }

    private function createAsset(
        Project $project,
        UploadedFile $file,
        string $kind,
        int $sortOrder,
        ?string $documentTitle = null,
    ): void {
        $stored = $this->projectAssetStorage->store($project, $file, $kind);

        $title = $kind === 'document'
            ? (string) $documentTitle
            : pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        $project->assets()->create([
            'kind' => $kind,
            'title' => $title,
            'file_name' => $stored['file_name'],
            'file_path' => $stored['file_path'],
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'file_size' => $file->getSize() ?: 0,
            'sort_order' => $sortOrder,
            'is_active' => true,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function projectPayload(Project $project, bool $includeLots = false): array
    {
        $project->loadMissing(['assets', 'projectType', 'city']);

        return [
            'id' => $project->id,
            'name' => $project->name,
            'project_type_id' => $project->project_type_id,
            'project_type' => $project->projectType ? [
                'id' => $project->projectType->id,
                'name' => $project->projectType->name,
                'code' => $project->projectType->code,
            ] : null,
            'location' => $project->location,
            'maps_url' => $this->locationMapsResolver->resolveMapsUrl($project->location),
            'location_label' => $this->locationMapsResolver->displayLabel($project->location),
            'total_lots' => $project->total_lots,
            'blocks' => $project->blocks,
            'is_active' => (bool) $project->is_active,
            'city_id' => $project->city_id,
            'city' => $project->city ? [
                'id' => $project->city->id,
                'name' => $project->city->name,
                'code' => $project->city->code,
                'department' => $project->city->department,
            ] : null,
            'province' => $project->province,
            'district' => $project->district,
            'project_zone' => $project->project_zone,
            'registry_status' => $project->registry_status,
            'descripcion' => $project->descripcion,
            'precio_web' => $project->precio_web !== null ? (float) $project->precio_web : null,
            'image_portada' => FileStorage::url($project->image_portada),
            'is_web' => (bool) $project->is_web,
            'tipo_web' => $project->tipo_web,
            'tour_360_url' => $project->tour_360_url,
            'assets' => $project->assets
                ->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))
                ->values()
                ->all(),
            'images' => $project->assets
                ->where('kind', 'image')
                ->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))
                ->values()
                ->all(),
            'documents' => $project->assets
                ->where('kind', 'document')
                ->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))
                ->values()
                ->all(),
            'videos' => $project->assets
                ->where('kind', 'video')
                ->map(fn (ProjectAsset $asset) => $this->assetPayload($project, $asset))
                ->values()
                ->all(),
            'lots' => $includeLots
                ? $project->lots
                    ->sort(fn (Lot $first, Lot $second): int => $this->compareLotsByBlockAndNumber($first, $second))
                    ->map(fn (Lot $lot) => $this->lotPayload($lot))
                    ->values()
                    ->all()
                : [],
        ];
    }

    private function compareLotsByBlockAndNumber(Lot $first, Lot $second): int
    {
        $blockCompare = strnatcasecmp($first->block, $second->block);

        if ($blockCompare !== 0) {
            return $blockCompare;
        }

        return strnatcasecmp($first->number, $second->number);
    }

    /**
     * @return array<string, mixed>
     */
    private function lotPayload(Lot $lot): array
    {
        $lot->loadMissing(['status', 'client', 'advisor']);

        $payload = $lot->toArray();
        $payload['client_phone'] = $lot->client?->phone;

        return ClientPhoneGuard::redactArray($payload);
    }

    /**
     * @return array<string, mixed>
     */
    private function assetPayload(Project $project, ProjectAsset $asset): array
    {
        $previewUrl = $this->assetPreviewUrl($asset);

        return [
            'id' => $asset->id,
            'kind' => $asset->kind,
            'title' => $asset->title,
            'file_name' => $asset->file_name,
            'mime_type' => $asset->mime_type,
            'file_size' => $asset->file_size,
            'sort_order' => $asset->sort_order,
            'is_active' => $asset->is_active,
            'download_url' => route('inmopro.projects.assets.download', [$project, $asset]),
            'preview_url' => $previewUrl,
        ];
    }

    /**
     * @return list<array{id: int, name: string, code: string, department: string|null}>
     */
    private function activeCitiesForSelect(): array
    {
        return City::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'department'])
            ->map(fn (City $city): array => [
                'id' => $city->id,
                'name' => $city->name,
                'code' => $city->code,
                'department' => $city->department,
            ])
            ->values()
            ->all();
    }

    private function syncPortada(Project $project, Request $request): void
    {
        if ($request->boolean('remove_portada')) {
            $this->deletePortadaFile($project);
            $project->update(['image_portada' => null]);

            return;
        }

        if (! $request->hasFile('portada_file')) {
            return;
        }

        $file = $request->file('portada_file');
        if (! $file instanceof UploadedFile) {
            return;
        }

        $this->deletePortadaFile($project);

        $extension = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg';
        $path = FileStorage::storeUploadedFile(
            $file,
            "projects/{$project->id}",
            'portada.'.$extension,
        );

        $project->update([
            'image_portada' => $path,
        ]);
    }

    private function deletePortadaFile(Project $project): void
    {
        FileStorage::deleteIfExists($project->image_portada);
    }

    private function assetPreviewUrl(ProjectAsset $asset): ?string
    {
        $isImage = $asset->kind === 'image' || str_starts_with((string) $asset->mime_type, 'image/');
        $isVideo = $asset->kind === 'video' || str_starts_with((string) $asset->mime_type, 'video/');

        if (! $isImage && ! $isVideo) {
            return null;
        }

        if (! FileStorage::exists($asset->file_path)) {
            return null;
        }

        return FileStorage::url($asset->file_path);
    }
}
