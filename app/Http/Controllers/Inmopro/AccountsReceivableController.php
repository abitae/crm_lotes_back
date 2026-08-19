<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreLotInstallmentRequest;
use App\Http\Requests\Inmopro\StoreLotPaymentRequest;
use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use App\Services\Inmopro\ReceivableService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountsReceivableController extends Controller
{
    public function __construct(
        private ReceivableService $receivableService
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());
        $statusLibre = LotStatus::where('code', 'LIBRE')->first();
        $statusPreReserva = LotStatus::where('code', 'PRERESERVA')->first();
        $query = Lot::with([
            'project',
            'client',
            'status',
            'installments',
            'payments.cashAccount',
        ])
            ->when($statusLibre, fn ($builder) => $builder->where('lot_status_id', '!=', $statusLibre->id))
            ->when($statusPreReserva, fn ($builder) => $builder->where('lot_status_id', '!=', $statusPreReserva->id));

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('team_id')) {
            $query->whereHas('advisor', fn ($builder) => $builder->where('team_id', $request->integer('team_id')));
        }

        $query->whereDate('contract_date', '>=', $startDate)
            ->whereDate('contract_date', '<=', $endDate);

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

        $lots = $query
            ->orderByRaw('contract_date IS NULL')
            ->orderByDesc('contract_date')
            ->orderByDesc('updated_at')
            ->paginate(15)
            ->withQueryString();
        $lots->through(function (Lot $lot): array {
            $totalScheduled = (float) $lot->installments->sum('amount');
            $totalPaid = (float) $lot->payments->sum('amount');
            $overdue = $lot->installments->where('status', 'VENCIDA')->count();

            return [
                'id' => $lot->id,
                'block' => $lot->block,
                'number' => $lot->number,
                'price' => $lot->price,
                'advance' => $lot->advance,
                'remaining_balance' => $lot->remaining_balance,
                'project' => $lot->project,
                'client' => $lot->client,
                'status' => $lot->status,
                'contract_date' => $lot->contract_date,
                'installments' => $lot->installments,
                'payments' => $lot->payments,
                'total_scheduled' => $totalScheduled,
                'total_paid' => $totalPaid,
                'overdue_installments' => $overdue,
            ];
        });

        $portfolioLots = clone $query;
        $lotsCollection = $portfolioLots->get();
        $overdueInstallments = (int) $lotsCollection->sum(fn (Lot $lot) => $lot->installments->where('status', 'VENCIDA')->count());
        $totalScheduled = (float) $lotsCollection->sum(fn (Lot $lot) => $lot->installments->sum('amount'));
        $totalCollected = (float) $lotsCollection->sum(fn (Lot $lot) => $lot->payments->sum('amount'));

        return Inertia::render('inmopro/accounts-receivable', [
            'lots' => $lots,
            'projects' => Project::query()->orderBy('name')->get(),
            'teams' => Team::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'lotStatuses' => LotStatus::orderBy('sort_order')->get(['id', 'name', 'code', 'color']),
            'cashAccounts' => CashAccount::where('is_active', true)->orderBy('name')->get(),
            'summary' => [
                'portfolio' => (float) $lotsCollection->sum(fn (Lot $lot) => (float) ($lot->sale_price ?? $lot->price)),
                'scheduled' => $totalScheduled,
                'collected' => $totalCollected,
                'pending' => max(0, $totalScheduled - $totalCollected),
                'overdueInstallments' => $overdueInstallments,
            ],
            'filters' => [
                ...$request->only('project_id', 'team_id', 'lot_status_id', 'status', 'search'),
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    public function storeInstallment(StoreLotInstallmentRequest $request, Lot $lot): RedirectResponse
    {
        $this->receivableService->createInstallment($lot, $request->validated());

        return back()->with('success', 'Cuota registrada correctamente.');
    }

    public function storePayment(StoreLotPaymentRequest $request, Lot $lot): RedirectResponse
    {
        $this->receivableService->recordPayment($lot, $request->validated());

        return back()->with('success', 'Pago registrado correctamente.');
    }
}
