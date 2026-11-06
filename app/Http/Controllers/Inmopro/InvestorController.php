<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\IndexInvestorsRequest;
use App\Http\Requests\Inmopro\StoreInvestorRequest;
use App\Models\Inmopro\Investor;
use App\Models\Inmopro\InvestorContract;
use App\Models\Inmopro\InvestorInstallment;
use App\Models\Inmopro\InvestorPaymentAllocation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class InvestorController extends Controller
{
    public function index(IndexInvestorsRequest $request): Response
    {
        $query = Investor::query();

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(fn (Builder $builder) => $builder
                ->where('name', 'like', "%{$term}%")
                ->orWhere('document_number', 'like', "%{$term}%")
                ->orWhereHas('contracts', fn (Builder $contracts) => $contracts->where('code', 'like', "%{$term}%")));
        }

        match ($request->input('status')) {
            'ACTIVOS' => $query->where('is_active', true),
            'INACTIVOS' => $query->where('is_active', false),
            'CON_MORA' => $query->whereHas('contracts', fn (Builder $contracts) => $contracts
                ->where('status', InvestorContract::STATUS_ACTIVE)
                ->whereHas('installments', fn (Builder $installments) => $this->overdueScope($installments))),
            default => null,
        };

        $investors = $query
            ->with(['contracts' => fn ($contracts) => $contracts->with('installments')])
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $investors->through(fn (Investor $investor): array => $this->investorRow($investor));

        return Inertia::render('inmopro/investors/index', [
            'investors' => $investors,
            'summary' => $this->summary(),
            'upcoming' => $this->upcomingInstallments(),
            'personTypes' => Investor::PERSON_TYPES,
            'documentTypes' => Investor::DOCUMENT_TYPES,
            'filters' => $request->only('search', 'status'),
        ]);
    }

    public function store(StoreInvestorRequest $request): RedirectResponse
    {
        $investor = Investor::create($request->validated());

        return to_route('inmopro.investors.show', $investor)->with('success', 'Inversionista registrado correctamente.');
    }

    public function show(Investor $investor): Response
    {
        $investor->load(['client:id,name', 'contracts' => fn ($contracts) => $contracts
            ->with(['project:id,name', 'installments'])
            ->latest('received_at')
            ->latest('id')]);

        return Inertia::render('inmopro/investors/show', [
            'investor' => [
                ...$investor->only([
                    'id', 'person_type', 'name', 'document_type', 'document_number', 'phone', 'email', 'address',
                    'bank_name', 'bank_account', 'bank_cci', 'client_id', 'is_active', 'notes',
                ]),
                'client' => $investor->client,
            ],
            'contracts' => $investor->contracts->map(fn (InvestorContract $contract): array => $this->contractRow($contract))->values(),
            'personTypes' => Investor::PERSON_TYPES,
            'documentTypes' => Investor::DOCUMENT_TYPES,
        ]);
    }

    public function update(StoreInvestorRequest $request, Investor $investor): RedirectResponse
    {
        $investor->update($request->validated());

        return back()->with('success', 'Inversionista actualizado correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function investorRow(Investor $investor): array
    {
        $active = $investor->contracts->where('status', InvestorContract::STATUS_ACTIVE);
        $unpaid = $active->flatMap(fn (InvestorContract $contract) => $contract->installments
            ->filter(fn (InvestorInstallment $installment): bool => $installment->balance() > 0)
            ->map(fn (InvestorInstallment $installment): array => [
                'currency' => $contract->currency,
                'due_date' => $installment->due_date?->toDateString(),
                'balance' => $installment->balance(),
            ]));

        return [
            'id' => $investor->id,
            'name' => $investor->name,
            'person_type' => $investor->person_type,
            'document_type' => $investor->document_type,
            'document_number' => $investor->document_number,
            'phone' => $investor->phone,
            'is_active' => $investor->is_active,
            'contracts_count' => $investor->contracts->count(),
            'active_contracts_count' => $active->count(),
            'pending_by_currency' => $unpaid->groupBy('currency')->map(fn ($rows) => round((float) $rows->sum('balance'), 2)),
            'principal_by_currency' => $active->groupBy('currency')->map(fn ($contracts) => round((float) $contracts->sum('principal_amount'), 2)),
            'next_due_date' => $unpaid->sortBy('due_date')->first()['due_date'] ?? null,
            'has_overdue' => $unpaid->contains(fn (array $row): bool => $row['due_date'] !== null && $row['due_date'] < today()->toDateString()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function contractRow(InvestorContract $contract): array
    {
        $paid = round((float) $contract->installments->sum('paid_amount'), 2);
        $total = (float) $contract->total_payable;
        $nextInstallment = $contract->installments
            ->filter(fn (InvestorInstallment $installment): bool => $installment->balance() > 0)
            ->sortBy([['due_date', 'asc'], ['sequence', 'asc']])
            ->first();

        return [
            ...$contract->only([
                'id', 'code', 'currency', 'principal_amount', 'rate_percent', 'rate_period', 'payment_mode', 'term_months',
                'installments_count', 'frequency', 'total_interest', 'total_payable', 'status',
            ]),
            'received_at' => $contract->received_at?->toDateString(),
            'project' => $contract->project,
            'paid_amount' => $paid,
            'pending_amount' => round(max(0, $total - $paid), 2),
            'progress' => $total > 0 ? round($paid / $total * 100, 1) : 0,
            'next_due_date' => $nextInstallment?->due_date?->toDateString(),
        ];
    }

    /**
     * Totales de contratos vigentes agrupados por moneda.
     *
     * @return list<array<string, float|string>>
     */
    private function summary(): array
    {
        $today = today()->toDateString();
        $in30 = today()->addDays(30)->toDateString();

        $installments = InvestorInstallment::query()
            ->join('investor_contracts as c', 'c.id', '=', 'investor_installments.investor_contract_id')
            ->where('c.status', InvestorContract::STATUS_ACTIVE)
            ->groupBy('c.currency')
            ->selectRaw('c.currency as currency')
            ->selectRaw('COALESCE(SUM(investor_installments.principal_amount), 0) as principal')
            ->selectRaw('COALESCE(SUM(investor_installments.interest_amount), 0) as interest')
            ->selectRaw('COALESCE(SUM(investor_installments.amount - investor_installments.paid_amount), 0) as pending')
            ->selectRaw('COALESCE(SUM(CASE WHEN investor_installments.due_date < ? AND investor_installments.paid_amount < investor_installments.amount THEN investor_installments.amount - investor_installments.paid_amount ELSE 0 END), 0) as overdue', [$today])
            ->selectRaw('COALESCE(SUM(CASE WHEN investor_installments.due_date >= ? AND investor_installments.due_date <= ? AND investor_installments.paid_amount < investor_installments.amount THEN investor_installments.amount - investor_installments.paid_amount ELSE 0 END), 0) as next30', [$today, $in30])
            ->toBase()
            ->get()
            ->keyBy('currency');

        $paid = InvestorPaymentAllocation::query()
            ->join('investor_installments as i', 'i.id', '=', 'investor_payment_allocations.investor_installment_id')
            ->join('investor_contracts as c', 'c.id', '=', 'i.investor_contract_id')
            ->where('c.status', InvestorContract::STATUS_ACTIVE)
            ->groupBy('c.currency')
            ->selectRaw('c.currency as currency')
            ->selectRaw('COALESCE(SUM(investor_payment_allocations.principal_amount), 0) as principal')
            ->selectRaw('COALESCE(SUM(investor_payment_allocations.interest_amount), 0) as interest')
            ->toBase()
            ->get()
            ->keyBy('currency');

        return $installments->map(fn ($row, string $currency): array => [
            'currency' => $currency,
            'capital_outstanding' => round((float) $row->principal - (float) ($paid[$currency]->principal ?? 0), 2),
            'interest_outstanding' => round((float) $row->interest - (float) ($paid[$currency]->interest ?? 0), 2),
            'pending' => round((float) $row->pending, 2),
            'overdue' => round((float) $row->overdue, 2),
            'next_30_days' => round((float) $row->next30, 2),
        ])->values()->all();
    }

    /**
     * Cuotas vencidas y las que vencen en los próximos 30 días.
     *
     * @return list<array<string, mixed>>
     */
    private function upcomingInstallments(): array
    {
        return InvestorInstallment::query()
            ->with('contract:id,investor_id,code,currency', 'contract.investor:id,name')
            ->whereHas('contract', fn (Builder $contracts) => $contracts->where('status', InvestorContract::STATUS_ACTIVE))
            ->whereColumn('paid_amount', '<', 'amount')
            ->whereDate('due_date', '<=', today()->addDays(30))
            ->orderBy('due_date')
            ->limit(50)
            ->get()
            ->map(fn (InvestorInstallment $installment): array => [
                'id' => $installment->id,
                'sequence' => $installment->sequence,
                'due_date' => $installment->due_date?->toDateString(),
                'balance' => $installment->balance(),
                'status' => $installment->status,
                'contract' => $installment->contract?->only(['id', 'code', 'currency']),
                'investor' => $installment->contract?->investor?->only(['id', 'name']),
            ])
            ->all();
    }

    /**
     * @param  Builder<InvestorInstallment>  $installments
     */
    private function overdueScope(Builder $installments): Builder
    {
        return $installments->whereColumn('paid_amount', '<', 'amount')->whereDate('due_date', '<', today());
    }
}
