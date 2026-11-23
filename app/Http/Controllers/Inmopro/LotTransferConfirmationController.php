<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\LotTransferConfirmationsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ApproveLotTransferConfirmationRequest;
use App\Http\Requests\Inmopro\IndexLotTransferConfirmationsRequest;
use App\Http\Requests\Inmopro\RejectLotTransferConfirmationRequest;
use App\Http\Requests\Inmopro\StoreLotTransferConfirmationRequest;
use App\Http\Requests\Inmopro\UpdateLotTransferQueueNotesRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotHistory;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\LotTransferVoucher;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\CommissionService;
use App\Services\Inmopro\LotHistoryRecorder;
use App\Support\ClientPhoneGuard;
use App\Support\FileStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        private CommissionService $commissionService,
        private LotHistoryRecorder $historyRecorder,
    ) {}

    public function index(IndexLotTransferConfirmationsRequest $request): Response
    {
        abort_unless($request->user()?->can('inmopro.lot-transfer-confirmations.index'), 403);

        $lots = $this->queueLotsQuery($request)
            ->paginate(15)
            ->withQueryString();
        $lots->through(fn (Lot $lot): array => ClientPhoneGuard::redactArray($lot->toArray()));

        return Inertia::render('inmopro/lot-transfer-confirmations/index', [
            'lots' => $lots,
            'filters' => $this->queueFilters($request),
            'projects' => Project::query()->active()->orderBy('name')->get(['id', 'name']),
            'advisors' => Advisor::query()->orderBy('name')->get(['id', 'name']),
            'lotStatuses' => LotStatus::query()
                ->whereIn('code', self::QUEUE_STATUS_CODES)
                ->orderByRaw('CASE code
                    WHEN ? THEN 1
                    WHEN ? THEN 2
                    WHEN ? THEN 3
                    ELSE 4
                END', [
                    LotStatus::CODE_RESERVADO,
                    LotStatus::CODE_CUOTAS,
                    LotStatus::CODE_TRANSFERIDO,
                ])
                ->get(['id', 'name', 'code', 'color']),
        ]);
    }

    public function exportExcel(IndexLotTransferConfirmationsRequest $request): BinaryFileResponse
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

        $lot->load(['project', 'status', 'client', 'advisor', 'latestTransferConfirmation.vouchers']);

        abort_unless($this->canRegisterTransfer($lot), 422, 'El lote no puede registrarse para transferencia.');

        return Inertia::render('inmopro/lots/transfer-confirmation', [
            'lot' => ClientPhoneGuard::redactArray($lot->toArray()),
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

        $validated = $request->validated();
        $storedPaths = [];

        try {
            $vouchers = [];

            foreach ($validated['vouchers'] as $index => $voucher) {
                $path = FileStorage::storeUploadedFile(
                    $request->file("vouchers.{$index}.image"),
                    'transfer-confirmations',
                );
                $storedPaths[] = $path;

                $vouchers[] = [
                    'bank' => $voucher['bank'],
                    'bank_other' => $voucher['bank'] === LotTransferVoucher::BANK_OTHER
                        ? trim((string) ($voucher['bank_other'] ?? ''))
                        : null,
                    'amount' => $voucher['amount'],
                    'operation_number' => trim((string) $voucher['operation_number']),
                    'image_path' => $path,
                ];
            }

            DB::transaction(function () use ($lot, $request, $vouchers, $transferredStatusId, $validated) {
                $confirmation = LotTransferConfirmation::create([
                    'lot_id' => $lot->id,
                    'status' => LotTransferConfirmation::STATUS_PENDING,
                    'evidence_path' => null,
                    'transfer_date' => $validated['transfer_date'],
                    'transfer_amount' => $validated['transfer_amount'],
                    'payer_name' => $validated['payer_name'],
                    'payer_dni' => $validated['payer_dni'] ?? null,
                    'requested_by' => $request->user()->id,
                ]);

                $createdVouchers = $confirmation->vouchers()->createMany($vouchers);

                foreach ($validated['expenses'] ?? [] as $expense) {
                    $lot->expenses()->create([
                        ...$expense,
                        'lot_transfer_confirmation_id' => $confirmation->id,
                        'created_by' => $request->user()->id,
                    ]);
                }

                $this->historyRecorder->withContext([
                    'event' => LotHistory::EVENT_TRANSFERRED,
                    'meta' => [
                        'lot_transfer_confirmation_id' => $confirmation->id,
                        'transfer_date' => $validated['transfer_date'],
                        'transfer_amount' => number_format((float) $validated['transfer_amount'], 2, '.', ''),
                        'payer_name' => $confirmation->payer_name,
                        'payer_dni' => $confirmation->payer_dni,
                        'payer_is_client' => $this->samePerson($lot, $confirmation->payer_name, $confirmation->payer_dni),
                        'vouchers' => $createdVouchers->map(fn (LotTransferVoucher $voucher): array => [
                            'id' => $voucher->id,
                            'bank' => $voucher->bank_label,
                            'amount' => number_format((float) $voucher->amount, 2, '.', ''),
                            'operation_number' => $voucher->operation_number,
                        ])->all(),
                    ],
                ], fn () => $lot->update([
                    'lot_status_id' => $transferredStatusId,
                    'notarial_transfer_date' => $validated['transfer_date'],
                    'sale_price' => $validated['transfer_amount'],
                ]));

                $this->commissionService->createCommissionsForTransferredLot($lot->fresh());
            });
        } catch (\Throwable $exception) {
            foreach ($storedPaths as $path) {
                FileStorage::deleteIfExists($path);
            }

            throw $exception;
        }

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

            $lot = $lot_transfer_confirmation->lot;
            $collectedAmount = $lot_transfer_confirmation->transfer_amount
                ?? $lot->sale_price
                ?? $lot->price;

            $lotUpdates = [
                'sale_price' => $collectedAmount,
                'advance' => $collectedAmount,
                'remaining_balance' => 0,
            ];

            if ($transferredStatusId && (int) $lot->lot_status_id !== (int) $transferredStatusId) {
                $lotUpdates['lot_status_id'] = $transferredStatusId;
            }

            $lot->update($lotUpdates);
            $lot = $lot->fresh();

            if (! $lot->commissions()->exists()) {
                $this->commissionService->createCommissionsForTransferredLot($lot);
            } else {
                $this->commissionService->recalculateForLot($lot);
            }
        });

        return redirect()->route('inmopro.lot-transfer-confirmations.index');
    }

    public function evidence(LotTransferConfirmation $lot_transfer_confirmation): StreamedResponse
    {
        abort_unless(FileStorage::exists($lot_transfer_confirmation->evidence_path), 404);

        return FileStorage::filesystem()->response(
            $lot_transfer_confirmation->evidence_path,
            basename($lot_transfer_confirmation->evidence_path),
        );
    }

    public function voucherImage(LotTransferVoucher $lot_transfer_voucher): StreamedResponse
    {
        abort_unless(FileStorage::exists($lot_transfer_voucher->image_path), 404);

        return FileStorage::filesystem()->response(
            $lot_transfer_voucher->image_path,
            basename($lot_transfer_voucher->image_path),
        );
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

            $lot = $lot_transfer_confirmation->lot;
            $lotUpdates = [];

            if ($reservedStatusId) {
                $lotUpdates['lot_status_id'] = $reservedStatusId;
            }

            $registeredDate = $lot_transfer_confirmation->transfer_date?->toDateString();
            $lotDate = $lot->notarial_transfer_date?->toDateString();

            if ($registeredDate !== null && $registeredDate === $lotDate) {
                $lotUpdates['notarial_transfer_date'] = null;
            }

            if ($lotUpdates !== []) {
                $this->historyRecorder->withContext([
                    'reason' => $lot_transfer_confirmation->rejection_reason,
                    'meta' => [
                        'lot_transfer_confirmation_id' => $lot_transfer_confirmation->id,
                        'payer_name' => $lot_transfer_confirmation->payer_name,
                    ],
                ], fn () => $lot->update($lotUpdates));
            }

            $this->commissionService->deletePendingCommissionsForLot($lot);
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
        $dates = $this->queueDateRange($request);

        return Lot::query()
            ->select('lots.*')
            ->with([
                'project',
                'status',
                'client',
                'advisor',
                'latestTransferConfirmation.requester',
                'latestTransferConfirmation.reviewer',
                'latestTransferConfirmation.vouchers',
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
            ->when($dates['date_from'] !== null || $dates['date_to'] !== null, function ($query) use ($request, $dates) {
                $column = $this->queueDateColumn($request);

                $query
                    ->when($dates['date_from'] !== null, fn ($dateQuery) => $dateQuery->whereDate($column, '>=', $dates['date_from']))
                    ->when($dates['date_to'] !== null, fn ($dateQuery) => $dateQuery->whereDate($column, '<=', $dates['date_to']));
            })
            ->when($pendingReview, function ($query) {
                $query->whereHas('latestTransferConfirmation', function ($transferQuery) {
                    $transferQuery->where('status', LotTransferConfirmation::STATUS_PENDING);
                });
            })
            ->orderByRaw('(
                SELECT CASE code
                    WHEN ? THEN 1
                    WHEN ? THEN 2
                    WHEN ? THEN 3
                    ELSE 4
                END
                FROM lot_statuses
                WHERE lot_statuses.id = lots.lot_status_id
            )', [
                LotStatus::CODE_RESERVADO,
                LotStatus::CODE_CUOTAS,
                LotStatus::CODE_TRANSFERIDO,
            ])
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
            'date_field' => $this->queueDateColumn($request),
            ...$this->queueDateRange($request),
        ];
    }

    /**
     * Sin fechas en la consulta, el rango es el mes en curso hasta hoy.
     * Una fecha vacía enviada a propósito deja ese extremo sin filtrar.
     *
     * @return array{date_from: ?string, date_to: ?string}
     */
    private function queueDateRange(Request $request): array
    {
        if (! $request->has('date_from') && ! $request->has('date_to')) {
            return [
                'date_from' => now()->startOfMonth()->toDateString(),
                'date_to' => now()->toDateString(),
            ];
        }

        return [
            'date_from' => $request->filled('date_from') ? $request->date('date_from')?->toDateString() : null,
            'date_to' => $request->filled('date_to') ? $request->date('date_to')?->toDateString() : null,
        ];
    }

    private function queueDateColumn(Request $request): string
    {
        $field = $request->string('date_field')->toString();

        return in_array($field, ['contract_date', 'payment_limit_date', 'notarial_transfer_date'], true)
            ? $field
            : 'contract_date';
    }

    private function samePerson(Lot $lot, ?string $payerName, ?string $payerDni): bool
    {
        if ($payerDni !== null && $lot->client_dni !== null) {
            return trim($payerDni) === trim($lot->client_dni);
        }

        return mb_strtolower(trim((string) $payerName)) === mb_strtolower(trim((string) $lot->client_name));
    }

    private function lotIsInQueue(Lot $lot): bool
    {
        $lot->loadMissing('status');

        return in_array($lot->status?->code, self::QUEUE_STATUS_CODES, true);
    }

    private function canRegisterTransfer(Lot $lot): bool
    {
        return $lot->status?->code === LotStatus::CODE_RESERVADO
            && ($lot->sale_price !== null || $lot->price !== null)
            && $lot->latestTransferConfirmation?->status !== LotTransferConfirmation::STATUS_PENDING;
    }
}
