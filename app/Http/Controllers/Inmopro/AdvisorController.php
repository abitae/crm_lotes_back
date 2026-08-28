<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\AdvisorsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ImportAdvisorConfirmRequest;
use App\Http\Requests\Inmopro\ImportAdvisorPreviewRequest;
use App\Http\Requests\Inmopro\StoreAdvisorMaterialItemRequest;
use App\Http\Requests\Inmopro\StoreAdvisorRequest;
use App\Http\Requests\Inmopro\UpdateAdvisorCazadorAccessRequest;
use App\Http\Requests\Inmopro\UpdateAdvisorMaterialItemsRequest;
use App\Http\Requests\Inmopro\UpdateAdvisorRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\AdvisorMaterialItem;
use App\Models\Inmopro\AdvisorMaterialType;
use App\Models\Inmopro\AdvisorMembership;
use App\Models\Inmopro\AdvisorProfileDocument;
use App\Models\Inmopro\City;
use App\Models\Inmopro\MembershipType;
use App\Models\Inmopro\Team;
use App\Services\Inmopro\AdvisorProfileService;
use App\Services\Inmopro\AdvisorsExcelImportService;
use App\Support\FileStorage;
use App\Support\InertiaListingRedirect;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdvisorController extends Controller
{
    public function excelTemplate(): BinaryFileResponse
    {
        return Excel::download(
            new AdvisorsExport(collect(), true),
            'plantilla_vendedores.xlsx'
        );
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        $query = Advisor::query()->with(['level', 'superior', 'team', 'city']);
        $this->applyAdvisorListFilters($query, $request);

        $advisors = $query->orderBy('name')->get();

        return Excel::download(
            new AdvisorsExport($advisors),
            'vendedores.xlsx'
        );
    }

    public function importPreview(ImportAdvisorPreviewRequest $request, AdvisorsExcelImportService $importService): JsonResponse
    {
        return response()->json($importService->preview($request->file('file')));
    }

    public function importConfirm(ImportAdvisorConfirmRequest $request, AdvisorsExcelImportService $importService): RedirectResponse
    {
        try {
            $importService->confirm($request->validated('token'), $request->user());
        } catch (RuntimeException $e) {
            return redirect()
                ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
            ->with('success', 'Importación de vendedores completada correctamente.');
    }

    public function search(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        $term = trim((string) $q);
        if ($term === '') {
            return response()->json([]);
        }
        $like = '%'.$term.'%';
        $advisors = Advisor::query()
            ->where('name', 'like', $like)
            ->orderBy('name')
            ->limit(15)
            ->get(['id', 'name']);

        return response()->json($advisors);
    }

    public function index(Request $request): Response
    {
        $query = Advisor::with([
            'level', 'superior', 'team', 'city',
            'memberships.membershipType',
            'memberships.installments',
            'memberships.payments',
            'materialItems' => fn ($q) => $q->orderByDesc('delivered_at')->orderByDesc('id'),
            'materialItems.type',
        ])->withCount('lots');

        $this->applyAdvisorListFilters($query, $request);

        $advisors = $query->orderBy('name')->paginate(20)->withQueryString();
        $advisors->getCollection()->transform(function (Advisor $advisor): Advisor {
            $this->normalizeAdvisorDateAttributes($advisor);

            if (! $advisor->relationLoaded('memberships')) {
                return $advisor;
            }

            $advisor->setRelation('memberships', $advisor->memberships->values()->map(function (AdvisorMembership $membership): AdvisorMembership {
                if ($membership->relationLoaded('installments')) {
                    $membership->setRelation('installments', $membership->installments->values());
                }
                if ($membership->relationLoaded('payments')) {
                    $membership->setRelation('payments', $membership->payments->values());
                }

                return $membership;
            }));

            return $advisor;
        });
        $advisorLevels = AdvisorLevel::orderBy('sort_order')->get();
        $advisorsList = Advisor::orderBy('name')->get(['id', 'name']);
        $teams = Team::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color']);
        $membershipTypes = MembershipType::orderBy('name')->get(['id', 'name', 'months', 'amount']);
        $materialTypes = AdvisorMaterialType::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name']);
        $cities = City::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'department']);

        $membershipDetail = null;
        if ($request->filled('membership_id')) {
            $m = AdvisorMembership::with(['advisor', 'membershipType', 'installments', 'payments'])->find($request->input('membership_id'));
            if ($m) {
                $m->setRelation('installments', $m->installments->values());
                $m->setRelation('payments', $m->payments->values());
                $membershipDetail = [
                    'membership' => $m,
                    'totalPaid' => $m->totalPaid(),
                    'balanceDue' => $m->balanceDue(),
                    'isPaid' => $m->isPaid(),
                ];
            }
        }

        $advisorForModal = null;
        if ($request->filled('modal') && $request->input('modal') === 'edit_advisor' && $request->filled('advisor_id')) {
            $advisorForModal = Advisor::with([
                'level',
                'city',
                'profile.documents',
                'materialItems' => fn ($q) => $q->orderByDesc('delivered_at')->orderByDesc('id'),
                'materialItems.type',
            ])->find($request->input('advisor_id'));

            if ($advisorForModal instanceof Advisor) {
                $this->normalizeAdvisorDateAttributes($advisorForModal);
            }
        }

        $today = Carbon::now()->startOfDay();
        $cutoff = $today->copy()->addDays(30);

        $birthdaysUpcoming = Advisor::query()
            ->whereNotNull('birth_date')
            ->tap(fn (Builder $q) => $this->applyBirthdayWindow($q, $today, $cutoff))
            ->count();

        $subscriptionsExpiring = Advisor::query()
            ->whereExists(function ($q) use ($today, $cutoff): void {
                $q->select(DB::raw(1))
                    ->from('advisor_memberships')
                    ->whereColumn('advisor_memberships.advisor_id', 'advisors.id')
                    ->whereNotNull('end_date')
                    ->whereBetween('end_date', [$today->toDateString(), $cutoff->toDateString()]);
            })
            ->count();

        return Inertia::render('inmopro/advisors/index', [
            'advisors' => $advisors,
            'advisorLevels' => $advisorLevels,
            'advisorsList' => $advisorsList,
            'teams' => $teams,
            'cities' => $cities,
            'membershipTypes' => $membershipTypes,
            'materialTypes' => $materialTypes,
            'membershipDetail' => $membershipDetail,
            'advisorForModal' => $advisorForModal,
            'openModal' => $request->input('modal'),
            'birthdaysUpcoming' => $birthdaysUpcoming,
            'subscriptionsExpiring' => $subscriptionsExpiring,
            'filters' => $request->only(
                'search',
                'advisor_level_id',
                'team_id',
                'is_active',
                'membership_pending',
                'joined_from',
                'joined_to',
                'birthday_from',
                'birthday_to',
                'birthdays_upcoming',
                'subscriptions_expiring',
            ),
        ]);
    }

    /**
     * Filtros compartidos entre el listado Inertia y la exportación Excel.
     */
    private function applyAdvisorListFilters(Builder $query, Request $request): void
    {
        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        if ($request->filled('advisor_level_id')) {
            $query->where('advisor_level_id', $request->integer('advisor_level_id'));
        }

        if ($request->filled('team_id')) {
            $query->where('team_id', $request->integer('team_id'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->boolean('membership_pending')) {
            $query->whereRaw(
                'EXISTS (
                    SELECT 1 FROM advisor_memberships am
                    LEFT JOIN membership_types mt ON mt.id = am.membership_type_id
                    WHERE am.advisor_id = advisors.id
                    AND (am.membership_type_id IS NULL OR mt.months = 12)
                    AND am.year = (
                        SELECT MAX(am2.year) FROM advisor_memberships am2
                        LEFT JOIN membership_types mt2 ON mt2.id = am2.membership_type_id
                        WHERE am2.advisor_id = advisors.id
                        AND (am2.membership_type_id IS NULL OR mt2.months = 12)
                    )
                    AND COALESCE((
                        SELECT SUM(amp.amount) FROM advisor_membership_payments amp
                        WHERE amp.advisor_membership_id = am.id
                    ), 0) < am.amount - 0.0000001
                )'
            );
        }

        $joinedFrom = $this->parseDateInput($request->input('joined_from'));
        $joinedTo = $this->parseDateInput($request->input('joined_to'));
        if ($joinedFrom) {
            $query->whereDate('joined_at', '>=', $joinedFrom->toDateString());
        }
        if ($joinedTo) {
            $query->whereDate('joined_at', '<=', $joinedTo->toDateString());
        }

        $birthdayFromRaw = $request->input('birthday_from');
        $birthdayToRaw = $request->input('birthday_to');
        $birthdayFrom = $this->parseDateInput($birthdayFromRaw);
        $birthdayTo = $this->parseDateInput($birthdayToRaw);
        if ($birthdayFrom || $birthdayTo) {
            $fromMmDd = $birthdayFrom ? $birthdayFrom->format('m-d') : '01-01';
            $toMmDd = $birthdayTo ? $birthdayTo->format('m-d') : '12-31';
            $query->whereNotNull('birth_date');
            $this->applyMmDdRange($query, $fromMmDd, $toMmDd);
        }

        if ($request->boolean('birthdays_upcoming')) {
            $today = Carbon::now()->startOfDay();
            $cutoff = $today->copy()->addDays(30);
            $query->whereNotNull('birth_date');
            $this->applyBirthdayWindow($query, $today, $cutoff);
        }

        if ($request->boolean('subscriptions_expiring')) {
            $today = Carbon::now()->startOfDay();
            $cutoff = $today->copy()->addDays(30);
            $query->whereExists(function ($q) use ($today, $cutoff): void {
                $q->select(DB::raw(1))
                    ->from('advisor_memberships')
                    ->whereColumn('advisor_memberships.advisor_id', 'advisors.id')
                    ->whereNotNull('end_date')
                    ->whereBetween('end_date', [$today->toDateString(), $cutoff->toDateString()]);
            });
        }
    }

    /**
     * Convierte una entrada de fecha (string) en Carbon o null si está vacía/inválida.
     */
    private function parseDateInput(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Devuelve la expresión SQL portable para extraer 'MM-DD' de una columna fecha.
     */
    private function mmDdExpression(Builder $query, string $column): string
    {
        $driver = $query->getConnection()->getDriverName();

        return $driver === 'sqlite'
            ? "strftime('%m-%d', {$column})"
            : "DATE_FORMAT({$column}, '%m-%d')";
    }

    /**
     * Aplica un filtro por rango de cumpleaños (MM-DD), soportando cruce de fin de año.
     */
    private function applyMmDdRange(Builder $query, string $fromMmDd, string $toMmDd): void
    {
        $expr = $this->mmDdExpression($query, 'birth_date');

        if ($fromMmDd <= $toMmDd) {
            $query->whereRaw("{$expr} BETWEEN ? AND ?", [$fromMmDd, $toMmDd]);

            return;
        }

        $query->where(function ($q) use ($expr, $fromMmDd, $toMmDd): void {
            $q->whereRaw("{$expr} >= ?", [$fromMmDd])
                ->orWhereRaw("{$expr} <= ?", [$toMmDd]);
        });
    }

    /**
     * Filtra vendedores cuyo cumpleaños (MM-DD) cae entre $today y $cutoff.
     */
    private function applyBirthdayWindow(Builder $query, Carbon $today, Carbon $cutoff): void
    {
        $this->applyMmDdRange($query, $today->format('m-d'), $cutoff->format('m-d'));
    }

    public function create(Request $request): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
            'modal' => 'create_advisor',
        ]));
    }

    public function new(): Response
    {
        return Inertia::render('inmopro/advisors/new', [
            'advisorLevels' => AdvisorLevel::orderBy('sort_order')->get(['id', 'name']),
            'advisorsList' => Advisor::orderBy('name')->get(['id', 'name']),
            'teams' => Team::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color']),
            'cities' => City::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'department']),
            'materialTypes' => AdvisorMaterialType::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function store(StoreAdvisorRequest $request, AdvisorProfileService $profileService): RedirectResponse
    {
        $validated = $request->validated();
        $materialItems = $validated['material_items'] ?? null;
        $profileData = $validated['profile'] ?? null;
        unset($validated['material_items'], $validated['profile']);

        $validated['username'] = $validated['username'] ?? str((string) $validated['email'])->before('@')->slug('_')->value();
        $pinWasProvided = filled($validated['pin'] ?? null);
        $validated['pin'] = $validated['pin'] ?? '123456';
        $validated['must_change_pin'] = ! $pinWasProvided;
        $validated['is_active'] = $validated['is_active'] ?? true;

        DB::transaction(function () use ($validated, $materialItems, $profileData, $request, $profileService): void {
            $advisor = Advisor::create($validated);
            $this->syncAdvisorMaterialItems($advisor, $materialItems);
            $profileService->syncFromRequest($advisor, $profileData, $request);
        });

        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))->with('success', 'Vendedor registrado correctamente.');
    }

    public function show(Request $request, Advisor $advisor): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
            'modal' => 'edit_advisor',
            'advisor_id' => $advisor->id,
        ]));
    }

    public function edit(Request $request, Advisor $advisor): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
            'modal' => 'edit_advisor',
            'advisor_id' => $advisor->id,
        ]));
    }

    public function toggleActive(Advisor $advisor): RedirectResponse
    {
        $activating = ! $advisor->is_active;
        $advisor->update(['is_active' => $activating]);

        $message = $activating
            ? 'Vendedor activado correctamente.'
            : 'Vendedor desactivado correctamente.';

        return back()->with('success', $message);
    }

    public function update(UpdateAdvisorRequest $request, Advisor $advisor, AdvisorProfileService $profileService): RedirectResponse
    {
        $validated = $request->validated();
        $materialItems = $validated['material_items'] ?? null;
        $profileData = $validated['profile'] ?? null;
        unset($validated['material_items'], $validated['profile']);

        $validated['username'] = $validated['username'] ?? $advisor->username ?? str((string) ($validated['email'] ?? $advisor->email))->before('@')->slug('_')->value();
        $validated['is_active'] = $validated['is_active'] ?? $advisor->is_active ?? true;

        if (empty($validated['pin'])) {
            unset($validated['pin']);
        }

        DB::transaction(function () use ($advisor, $validated, $materialItems, $profileData, $request, $profileService): void {
            $advisor->update($validated);
            $this->syncAdvisorMaterialItems($advisor->fresh(), $materialItems);
            $profileService->syncFromRequest($advisor->fresh(), $profileData, $request);
        });

        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request));
    }

    public function downloadProfileDocument(Advisor $advisor, AdvisorProfileDocument $document): StreamedResponse
    {
        $document->load('profile');
        abort_unless($document->profile && $document->profile->advisor_id === $advisor->id, 404);

        if (! FileStorage::exists($document->file_path)) {
            abort(404);
        }

        return FileStorage::filesystem()->response($document->file_path, $document->file_name, [
            'Content-Type' => $document->mime_type ?: 'application/octet-stream',
        ]);
    }

    public function updateCazadorAccess(UpdateAdvisorCazadorAccessRequest $request, Advisor $advisor): RedirectResponse
    {
        $validated = $request->validated();
        $usernameChanged = $advisor->username !== $validated['username'];
        $pinChanged = $request->filled('pin');

        $advisor->username = $validated['username'];

        if ($pinChanged) {
            $advisor->pin = $validated['pin'];
        }

        $advisor->save();

        if ($usernameChanged || $pinChanged) {
            $advisor->apiTokens()->delete();
        }

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
            ->with('success', 'Usuario y acceso Cazador actualizados. Si cambió el PIN o el usuario, el vendedor debe iniciar sesión de nuevo en la app.');
    }

    public function updateMaterialItems(UpdateAdvisorMaterialItemsRequest $request, Advisor $advisor): RedirectResponse
    {
        $this->syncAdvisorMaterialItems($advisor, $request->validated('material_items'));

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
            ->with('success', 'Materiales del vendedor actualizados.');
    }

    public function storeMaterialItem(StoreAdvisorMaterialItemRequest $request, Advisor $advisor): RedirectResponse
    {
        $validated = $request->validated();
        $deliveredRaw = $validated['delivered_at'] ?? null;
        $deliveredAt = null;
        if (is_string($deliveredRaw) && $deliveredRaw !== '') {
            $deliveredAt = Carbon::parse($deliveredRaw)->startOfDay();
        } else {
            $deliveredAt = Carbon::now()->startOfDay();
        }

        AdvisorMaterialItem::query()->create([
            'advisor_id' => $advisor->id,
            'advisor_material_type_id' => (int) $validated['advisor_material_type_id'],
            'delivered_at' => $deliveredAt,
            'notes' => isset($validated['notes']) && is_string($validated['notes']) && $validated['notes'] !== '' ? $validated['notes'] : null,
        ]);

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
            ->with('success', 'Entrega de material registrada.');
    }

    private function normalizeAdvisorDateAttributes(Advisor $advisor): void
    {
        foreach (['birth_date', 'joined_at'] as $attribute) {
            $value = $advisor->getAttribute($attribute);

            if ($value instanceof \DateTimeInterface) {
                $advisor->setAttribute($attribute, $value->format('Y-m-d'));
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $items
     */
    private function syncAdvisorMaterialItems(Advisor $advisor, ?array $items): void
    {
        if ($items === null) {
            return;
        }

        foreach ($items as $row) {
            $deliveredRaw = $row['delivered_at'] ?? null;
            $deliveredAt = null;
            if (is_string($deliveredRaw) && $deliveredRaw !== '') {
                $deliveredAt = Carbon::parse($deliveredRaw);
            }

            $typeId = (int) $row['advisor_material_type_id'];
            $notes = isset($row['notes']) && is_string($row['notes']) && $row['notes'] !== '' ? $row['notes'] : null;

            $existing = AdvisorMaterialItem::query()
                ->where('advisor_id', $advisor->id)
                ->where('advisor_material_type_id', $typeId)
                ->orderByDesc('delivered_at')
                ->orderByDesc('id')
                ->first();

            if ($existing) {
                $existing->update([
                    'delivered_at' => $deliveredAt,
                    'notes' => $notes,
                ]);
            } else {
                AdvisorMaterialItem::query()->create([
                    'advisor_id' => $advisor->id,
                    'advisor_material_type_id' => $typeId,
                    'delivered_at' => $deliveredAt,
                    'notes' => $notes,
                ]);
            }
        }
    }
}
