<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreCatalogItemRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Services\Crm\AdvisorCrmCatalogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PipelineController extends Controller
{
    public function __construct(private AdvisorCrmCatalogService $catalogService) {}

    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $this->catalogService->ensureDefaults($advisor);

        return Inertia::render('crm/pipeline/index', [
            'statuses' => ClientStatus::query()
                ->forAdvisor($advisor->id)
                ->withCount('clients')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'color', 'sort_order', 'is_active']),
            'tags' => ClientTag::query()
                ->forAdvisor($advisor->id)
                ->withCount('clients')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'color', 'sort_order', 'is_active']),
        ]);
    }

    public function storeStatus(StoreCatalogItemRequest $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $validated = $request->validated();

        ClientStatus::query()->create([
            'advisor_id' => $advisor->id,
            'name' => $validated['name'],
            'code' => $this->catalogService->uniqueCode($advisor, $validated['name'], 'status'),
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#64748b',
            'sort_order' => $validated['sort_order'] ?? ((int) ClientStatus::query()->forAdvisor($advisor->id)->max('sort_order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', 'Estado creado.');
    }

    public function updateStatus(StoreCatalogItemRequest $request, ClientStatus $status): RedirectResponse
    {
        $owned = $this->ownedStatus($request, $status);
        $validated = $request->validated();

        $owned->update([
            'name' => $validated['name'],
            'code' => $this->catalogService->uniqueCode($request->user('advisor'), $validated['name'], 'status', $owned->id),
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? $owned->color,
            'sort_order' => $validated['sort_order'] ?? $owned->sort_order,
            'is_active' => $validated['is_active'] ?? $owned->is_active,
        ]);

        return back()->with('success', 'Estado actualizado.');
    }

    public function destroyStatus(Request $request, ClientStatus $status): RedirectResponse
    {
        $owned = $this->ownedStatus($request, $status);

        if ($owned->clients()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'No puedes eliminar un estado que tiene clientes. Muévelos antes o desactívalo.',
            ]);
        }

        $owned->delete();

        return back()->with('success', 'Estado eliminado.');
    }

    public function storeTag(StoreCatalogItemRequest $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $validated = $request->validated();

        ClientTag::query()->create([
            'advisor_id' => $advisor->id,
            'name' => $validated['name'],
            'code' => $this->catalogService->uniqueCode($advisor, $validated['name'], 'tag'),
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#64748b',
            'sort_order' => $validated['sort_order'] ?? ((int) ClientTag::query()->forAdvisor($advisor->id)->max('sort_order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', 'Etiqueta creada.');
    }

    public function updateTag(StoreCatalogItemRequest $request, ClientTag $tag): RedirectResponse
    {
        $owned = $this->ownedTag($request, $tag);
        $validated = $request->validated();

        $owned->update([
            'name' => $validated['name'],
            'code' => $this->catalogService->uniqueCode($request->user('advisor'), $validated['name'], 'tag', $owned->id),
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? $owned->color,
            'sort_order' => $validated['sort_order'] ?? $owned->sort_order,
            'is_active' => $validated['is_active'] ?? $owned->is_active,
        ]);

        return back()->with('success', 'Etiqueta actualizada.');
    }

    public function destroyTag(Request $request, ClientTag $tag): RedirectResponse
    {
        $owned = $this->ownedTag($request, $tag);

        if ($owned->clients()->exists()) {
            throw ValidationException::withMessages([
                'tag' => 'No puedes eliminar una etiqueta asignada a clientes. Quítala antes o desactívala.',
            ]);
        }

        $owned->delete();

        return back()->with('success', 'Etiqueta eliminada.');
    }

    private function ownedStatus(Request $request, ClientStatus $status): ClientStatus
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return ClientStatus::query()
            ->forAdvisor($advisor->id)
            ->whereKey($status->id)
            ->firstOrFail();
    }

    private function ownedTag(Request $request, ClientTag $tag): ClientTag
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        return ClientTag::query()
            ->forAdvisor($advisor->id)
            ->whereKey($tag->id)
            ->firstOrFail();
    }
}
