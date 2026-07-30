<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\LotTransferConfirmationsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ApproveLotTransferConfirmationRequest;
use App\Http\Requests\Inmopro\RejectLotTransferConfirmationRequest;
use App\Http\Requests\Inmopro\StoreLotTransferConfirmationRequest;
use App\Http\Requests\Inmopro\UpdateLotTransferQueueNotesRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\CommissionService;
use App\Support\FileStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LotTransferConfirmationController extends Controller
{
    /**
     * @var list<string>
     */
    private const QUEUE_STATUS_CODES = [
        LotStatus::CODE_RESERVADO,
        LotStatus::CODE_TRANSFERIDO,
        LotStatus::CODE_CUOTAS,
    ];

    public function __construct(
        private CommissionService $commissionService
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->can('inmopro.lot-transfer-confirmations.index'), 403);

        $lots = $this->queueLotsQuery($request)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('inmopro/lot-transfer-confirmations/index', [
            'lots' => $lots,
            'filters' => $this->queueFilters($request),
            'projects' => Project::query()->active()->orderBy('name')->get(['id', 'name']),
            'advisors' => Advisor::query()->orderBy('name')->get(['id', 'name']),
            'lotStatuses' => LotStatus::query()
                ->whereIn('code', self::QUEUE_STATUS_CODES)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code', 'color']),
        ]);
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        abort_unless($request->user()?->can('inmopro.lot-transfer-confirmations.index'), 403);

        $lots = $this->queueLotsQuery($request)->get();

        return Excel::download(
            new LotTransferConfirmationsExport($lots),
            'transferencias_lotes.xlsx',
        );
    }

    public function create(Request $request, Lot $lot): Response
    {
        abort_unless($request->user()?->can('inmopro.lots.transfer-confirmation'), 403);

        $lot->load(['project', 'status', 'client', 'advisor', 'latestTransferConfirmation']);

        abort_unless($this->canRegisterTransfer($lot), 422, 'El lote no puede registrarse para transferencia.');

        return Inertia::render('inmopro/lots/transfer-confirmation', [
            'lot' => $lot,
        ]);
    }

    public function store(StoreLotTransferConfirmationRequest $request, Lot $lot): RedirectResponse
    {
        $lot->load(['status', 'latestTransferConfirmation']);

        if (! $this->canRegisterTransfer($lot)) {
            return back()->withErrors([
                'evidence_image' => 'El lote debe estar reservado y sin una transferencia pendiente.',
            ]);
        }

        $transferredStatusId = LotStatus::query()->where('code', LotStatus::CODE_TRANSFERIDO)->value('id');

        if (! $transferredStatusId) {
            return back()->withErrors([
                'evidence_image' => 'No existe el estado TRANSFERIDO configurado.',
            ]);
        }

        $storedPath = FileStorage::storeUploadedFile(
            $request->file('evidence_image'),
            'inmopro/lot-transfer-confirmations',
        );

        DB::transaction(function () use ($lot, $request, $storedPath, $transferredStatusId) {
            LotTransferConfirmation::create([
                'lot_id' => $lot->id,
                'status' => LotTransferConfirmation::STATUS_PENDING,
                'evidence_path' => $storedPath,
                'requested_by' => $request->user()->id,
            ]);

            $lot->update([
                'lot_status_id' => $transferredStatusId,
            ]);
        });

        return redirect()->route('inmopro.lot-transfer-confirmations.index');
    }

    public function approve(ApproveLotTransferConfirmationRequest $request, LotTransferConfirmation $lot_transfer_confirmation): RedirectResponse
    {
        $lot_transfer_confirmation->load('lot');

        if ($lot_transfer_confirmation->status !== LotTransferConfirmation::STATUS_PENDING) {
            return redirect()->route('inmopro.lot-transfer-confirmations.index')
                ->withErrors(['transfer' => 'Solo se pueden aprobar transferencias pendientes.']);
        }

        $transferredStatusId = LotStatus::query()->where('code', LotStatus::CODE_TRANSFERIDO)->value('id');

        DB::transaction(function () use ($lot_transfer_confirmation, $request, $transferredStatusId) {
            $lot_transfer_confirmation->update([
                'status' => LotTransferConfirmation::STATUS_APPROVED,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $request->string('review_notes')->toString(),
                'rejection_reason' => null,
            ]);

            if ($transferredStatusId && (int) $lot_transfer_confirmation->lot->lot_status_id !== (int) $transferredStatusId) {
                $lot_transfer_confirmation->lot->update([
                    'lot_status_id' => $transferredStatusId,
                ]);
            }

            $lot_transfer_confirmation->lot->update([
                'advance' => $lot_transfer_confirmation->lot->price,
                'remaining_balance' => 0,
            ]);

            if (! $lot_transfer_confirmation->lot->commissions()->exists()) {
                $this->commissionService->createCommissionsForTransferredLot($lot_transfer_confirmation->lot->fresh());
            }
        });

        return redirect()->route('inmopro.lot-transfer-confirmations.index');
    }

    public function reject(RejectLotTransferConfirmationRequest $request, LotTransferConfirmation $lot_transfer_confirmation): RedirectResponse
    {
        $lot_transfer_confirmation->load('lot');

        if ($lot_transfer_confirmation->status !== LotTransferConfirmation::STATUS_PENDING) {
            return redirect()->route('inmopro.lot-transfer-confirmations.index')
                ->withErrors(['transfer' => 'Solo se pueden rechazar transferencias pendientes.']);
        }

        $reservedStatusId = LotStatus::query()->where('code', LotStatus::CODE_RESERVADO)->value('id');

        DB::transaction(function () use ($lot_transfer_confirmation, $request, $reservedStatusId) {
            $lot_transfer_confirmation->update([
                'status' => LotTransferConfirmation::STATUS_REJECTED,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $request->string('rejection_reason')->toString(),
            ]);

            if ($reservedStatusId) {
                $lot_transfer_confirmation->lot->update([
                    'lot_status_id' => $reservedStatusId,
                ]);
            }
        });

        return redirect()->route('inmopro.lot-transfer-confirmations.index');
    }

    public function updateLotNotes(UpdateLotTransferQueueNotesRequest $request, Lot $lot): RedirectResponse
    {
        abort_unless($this->lotIsInQueue($lot), 404);

        $lot->update([
            'notes' => $request->string('notes')->toString() ?: null,
        ]);

        return back();
    }

    /**
     * @return Builder<Lot>
     */
    private function queueLotsQuery(Request $request): Builder
    {
        $search = trim((string) $request->string('search'));
        $pendingReview = $request->boolean('pending_review');

        return Lot::query()
            ->with([
                'project',
                'status',
                'client',
                'advisor',
                'latestTransferConfirmation.requester',
                'latestTransferConfirmation.reviewer',
            ])
            ->whereHas('status', fn ($query) => $query->whereIn('code', self::QUEUE_STATUS_CODES))
            ->when($request->filled('project_id'), fn ($query) => $query->where('project_id', $request->integer('project_id')))
            ->when($request->filled('lot_status_id'), function ($query) use ($request) {
                $query->whereHas('status', function ($statusQuery) use ($request) {
                    $statusQuery
                        ->whereIn('code', self::QUEUE_STATUS_CODES)
                        ->whereKey($request->integer('lot_status_id'));
                });
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($lotQuery) use ($search) {
                    $lotQuery
                        ->where('block', 'like', "%{$search}%")
                        ->orWhere('number', 'like', "%{$search}%")
                        ->orWhere('client_name', 'like', "%{$search}%")
                        ->orWhere('client_dni', 'like', "%{$search}%")
                        ->orWhereHas('client', function ($clientQuery) use ($search) {
                            $clientQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('dni', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('advisor_id'), fn ($query) => $query->where('advisor_id', $request->integer('advisor_id')))
            ->when($pendingReview, function ($query) {
                $query->whereHas('latestTransferConfirmation', function ($transferQuery) {
                    $transferQuery->where('status', LotTransferConfirmation::STATUS_PENDING);
                });
            })
            ->orderByRaw('contract_date IS NULL')
            ->orderBy('contract_date')
            ->orderByRaw('payment_limit_date IS NULL')
            ->orderBy('payment_limit_date')
            ->orderBy('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function queueFilters(Request $request): array
    {
        $pendingReview = $request->boolean('pending_review');

        return [
            'project_id' => $request->input('project_id'),
            'lot_status_id' => $request->input('lot_status_id'),
            'search' => $request->input('search'),
            'advisor_id' => $request->input('advisor_id'),
            'pending_review' => $pendingReview ? '1' : null,
        ];
    }

    private function lotIsInQueue(Lot $lot): bool
    {
        $lot->loadMissing('status');

        return in_array($lot->status?->code, self::QUEUE_STATUS_CODES, true);
    }

    private function canRegisterTransfer(Lot $lot): bool
    {
        return $lot->status?->code === LotStatus::CODE_RESERVADO
            && $lot->latestTransferConfirmation?->status !== LotTransferConfirmation::STATUS_PENDING;
    }
}
