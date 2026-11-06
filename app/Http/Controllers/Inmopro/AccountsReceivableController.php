<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\IndexAccountsReceivableRequest;
use App\Http\Requests\Inmopro\StoreLotInstallmentRequest;
use App\Http\Requests\Inmopro\StoreLotPaymentRequest;
use App\Http\Requests\Inmopro\StoreLotPaymentScheduleRequest;
use App\Http\Requests\Inmopro\VoidLotPaymentRequest;
use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotInstallment;
use App\Models\Inmopro\LotPayment;
use App\Models\Inmopro\LotPaymentPlan;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use App\Services\Inmopro\PaymentScheduleService;
use App\Services\Inmopro\ReceivableService;
use App\Support\FileStorage;
use App\Support\InstallmentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountsReceivableController extends Controller
{
    public function __construct(
        private ReceivableService $receivableService,
        private PaymentScheduleService $paymentScheduleService,
    ) {}

    public function index(IndexAccountsReceivableRequest $request): Response
    {
        $usesDefaultPeriod = ! $request->has('start_date') && ! $request->has('end_date');
        $startDate = $usesDefaultPeriod ? now()->startOfMonth()->toDateString() : $request->input('start_date');
        $endDate = $usesDefaultPeriod ? now()->endOfMonth()->toDateString() : $request->input('end_date');

        $query = Lot::query()
            ->whereHas('status', fn ($builder) => $builder->whereNotIn('code', [LotStatus::CODE_LIBRE, LotStatus::CODE_PRERESERVA]));

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('team_id')) {
            $query->whereHas('advisor', fn ($builder) => $builder->where('team_id', $request->integer('team_id')));
        }

        if ($startDate) {
            $query->whereDate('contract_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('contract_date', '<=', $endDate);
        }

        if ($request->filled('lot_status_id')) {
            $query->where('lot_status_id', $request->integer('lot_status_id'));
        }

        if ($request->filled('status')) {
            $requestedStatus = $request->input('status');
            $query->whereHas('installments', fn ($builder) => $builder->where('status', $requestedStatus));
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($term) {
                $builder->where('block', 'like', "%{$term}%")
                    ->orWhere('number', 'like', "%{$term}%")
                    ->orWhereHas('client', fn ($clientQuery) => $clientQuery
                        ->where('name', 'like', "%{$term}%")
                        ->orWhere('dni', 'like', "%{$term}%"));
            });
        }

        $summary = $this->buildSummary($query);

        $lots = (clone $query)
            ->with([
                'project',
                'client',
                'status',
                'installments',
                'payments.cashAccount',
                'payments.allocations.installment:id,sequence',
                'paymentPlans',
            ])
            ->orderByRaw('contract_date IS NULL')
            ->orderByDesc('contract_date')
            ->orderByDesc('updated_at')
            ->paginate(15)
            ->withQueryString();
        $lots->through(function (Lot $lot): array {
            $outstanding = $this->receivableService->outstandingBalance($lot);
            $unpaidInstallments = $lot->installments
                ->filter(fn (LotInstallment $installment): bool => $installment->balance() > 0)
                ->sortBy([['due_date', 'asc'], ['sequence', 'asc']])
                ->values();
            $nextInstallment = $unpaidInstallments->first();
            $oldestOverdue = $unpaidInstallments->first(fn (LotInstallment $installment): bool => $installment->status === InstallmentStatus::VENCIDA);
            $scheduledBalance = (float) $unpaidInstallments->sum(fn (LotInstallment $installment): float => $installment->balance());
            $partiallyPaidBalance = (float) $unpaidInstallments
                ->filter(fn (LotInstallment $installment): bool => (float) $installment->paid_amount > 0)
                ->sum(fn (LotInstallment $installment): float => $installment->balance());

            return [
                'id' => $lot->id,
                'block' => $lot->block,
                'number' => $lot->number,
                'price' => $lot->price,
                'sale_price' => $lot->sale_price,
                'advance' => (float) ($lot->advance ?? 0),
                'remaining_balance' => $outstanding,
                'project' => $lot->project,
                'client' => $lot->client,
                'status' => $lot->status,
                'contract_date' => $lot->contract_date,
                'installments' => $lot->installments,
                'payments' => $lot->payments,
                'total_scheduled' => (float) $lot->installments->sum('amount'),
                'overdue_installments' => $lot->installments->where('status', InstallmentStatus::VENCIDA)->count(),
                'can_receive_payments' => $this->receivableService->canReceivePayments($lot),
                'payment_plans' => $lot->paymentPlans,
                'schedulable_amount' => [
                    PaymentScheduleService::MODE_APPEND => max(0, round($outstanding - $scheduledBalance, 2)),
                    PaymentScheduleService::MODE_REPLACE => max(0, round($outstanding - $partiallyPaidBalance, 2)),
                ],
                'next_installment' => $nextInstallment ? [
                    'sequence' => $nextInstallment->sequence,
                    'due_date' => $nextInstallment->due_date?->toDateString(),
                    'balance' => $nextInstallment->balance(),
                ] : null,
                'overdue_days' => $oldestOverdue?->due_date
                    ? (int) $oldestOverdue->due_date->copy()->startOfDay()->diffInDays(today())
                    : 0,
            ];
        });

        return Inertia::render('inmopro/accounts-receivable', [
            'lots' => $lots,
            'projects' => Project::query()->orderBy('name')->get(),
            'teams' => Team::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'lotStatuses' => LotStatus::query()
                ->whereNotIn('code', [LotStatus::CODE_LIBRE, LotStatus::CODE_PRERESERVA])
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code', 'color']),
            'installmentStatuses' => InstallmentStatus::all(),
            'paymentMethods' => LotPayment::PAYMENT_METHODS,
            'scheduleFrequencies' => LotPaymentPlan::FREQUENCIES,
            'cashAccounts' => CashAccount::where('is_active', true)->orderBy('name')->get(),
            'summary' => $summary,
            'filters' => [
                ...$request->only('project_id', 'team_id', 'lot_status_id', 'status', 'search'),
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
            ],
        ]);
    }

    public function storeInstallment(StoreLotInstallmentRequest $request, Lot $lot): RedirectResponse
    {
        $this->receivableService->createInstallment($lot, $request->validated());

        return back()->with('success', 'Cuota registrada correctamente.');
    }

    public function storePaymentSchedule(StoreLotPaymentScheduleRequest $request, Lot $lot): RedirectResponse
    {
        $plan = $this->paymentScheduleService->generate($lot, $request->validated(), $request->user()?->id);

        return back()->with('success', sprintf('Cronograma de %d cuotas generado correctamente.', $plan->installments_count));
    }

    public function storePayment(StoreLotPaymentRequest $request, Lot $lot): RedirectResponse
    {
        $this->receivableService->recordPayment(
            $lot,
            $request->safe()->except('voucher_image'),
            $request->file('voucher_image'),
        );

        return back()->with('success', 'Pago registrado correctamente.');
    }

    public function destroyPayment(VoidLotPaymentRequest $request, LotPayment $lot_payment): RedirectResponse
    {
        $this->receivableService->voidPayment($lot_payment, $request->string('reason')->toString());

        return back()->with('success', 'Abono anulado correctamente.');
    }

    public function voucher(LotPayment $lot_payment): StreamedResponse
    {
        abort_unless(FileStorage::exists($lot_payment->voucher_path), 404);

        return FileStorage::filesystem()->response(
            $lot_payment->voucher_path,
            basename($lot_payment->voucher_path),
        );
    }

    /**
     * @param  Builder<Lot>  $query
     * @return array{portfolio: float, scheduled: float, collected: float, pending: float, overdueInstallments: int}
     */
    private function buildSummary($query): array
    {
        $salePriceSql = 'COALESCE(sale_price, price, 0)';

        $totals = (clone $query)->toBase()
            ->selectRaw("COALESCE(SUM({$salePriceSql}), 0) as portfolio")
            ->selectRaw('COALESCE(SUM(COALESCE(advance, 0)), 0) as collected')
            ->selectRaw("COALESCE(SUM(CASE WHEN {$salePriceSql} - COALESCE(advance, 0) > 0 THEN {$salePriceSql} - COALESCE(advance, 0) ELSE 0 END), 0) as pending")
            ->first();

        $lotIds = (clone $query)->select('lots.id');
        $installments = LotInstallment::query()->whereIn('lot_id', $lotIds);

        return [
            'portfolio' => round((float) $totals->portfolio, 2),
            'scheduled' => round((float) (clone $installments)->sum('amount'), 2),
            'collected' => round((float) $totals->collected, 2),
            'pending' => round((float) $totals->pending, 2),
            'overdueInstallments' => (clone $installments)->where('status', InstallmentStatus::VENCIDA)->count(),
        ];
    }
}
