<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\InvestorContractScheduleExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ActivateInvestorContractRequest;
use App\Http\Requests\Inmopro\StoreInvestorContractRequest;
use App\Http\Requests\Inmopro\StoreInvestorPaymentRequest;
use App\Http\Requests\Inmopro\VoidInvestorContractRequest;
use App\Http\Requests\Inmopro\VoidInvestorPaymentRequest;
use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\Investor;
use App\Models\Inmopro\InvestorContract;
use App\Models\Inmopro\InvestorPayment;
use App\Models\Inmopro\Project;
use App\Services\Inmopro\InvestorContractService;
use App\Support\FileStorage;
use App\Support\ScheduleMath;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvestorContractController extends Controller
{
    public function __construct(
        private InvestorContractService $contractService
    ) {}

    public function create(Investor $investor): Response
    {
        return Inertia::render('inmopro/investors/contract-form', [
            'investor' => $investor->only(['id', 'name', 'document_number']),
            'contract' => null,
            ...$this->formOptions(),
        ]);
    }

    public function store(StoreInvestorContractRequest $request, Investor $investor): RedirectResponse
    {
        $contract = $this->contractService->create(
            $investor,
            $request->safe()->except('contract_file'),
            $request->file('contract_file'),
            $request->user()?->id,
        );

        return to_route('inmopro.investor-contracts.show', $contract)
            ->with('success', sprintf('Contrato %s creado en borrador. Revise el cronograma y actívelo.', $contract->code));
    }

    public function show(InvestorContract $investor_contract): Response
    {
        $investor_contract->load([
            'investor',
            'project:id,name',
            'cashAccount:id,name,currency',
            'installments',
            'payments' => fn ($payments) => $payments->with(['cashAccount:id,name', 'allocations.installment:id,sequence'])->latest('paid_at')->latest('id'),
            'cashEntries' => fn ($entries) => $entries->with('cashAccount:id,name')->latest('entry_date')->latest('id'),
        ]);

        $outstanding = round((float) $investor_contract->installments->sum(fn ($installment) => $installment->balance()), 2);

        return Inertia::render('inmopro/investors/contract-show', [
            'contract' => [
                ...$investor_contract->toArray(),
                'has_document' => filled($investor_contract->contract_path),
                'outstanding' => $outstanding,
                'paid_amount' => round((float) $investor_contract->installments->sum('paid_amount'), 2),
                'withheld_amount' => round((float) $investor_contract->payments->sum('withholding_amount'), 2),
            ],
            'cashAccounts' => CashAccount::query()
                ->where('is_active', true)
                ->where('currency', $investor_contract->currency)
                ->orderBy('name')
                ->get(['id', 'name', 'currency', 'current_balance']),
            'paymentMethods' => InvestorPayment::PAYMENT_METHODS,
        ]);
    }

    public function edit(InvestorContract $investor_contract): Response|RedirectResponse
    {
        if (! $investor_contract->isEditable()) {
            return to_route('inmopro.investor-contracts.show', $investor_contract)
                ->with('error', 'Solo se puede editar un contrato en borrador.');
        }

        $investor_contract->load(['investor', 'installments']);

        return Inertia::render('inmopro/investors/contract-form', [
            'investor' => $investor_contract->investor->only(['id', 'name', 'document_number']),
            'contract' => $investor_contract,
            ...$this->formOptions(),
        ]);
    }

    public function update(StoreInvestorContractRequest $request, InvestorContract $investor_contract): RedirectResponse
    {
        $this->contractService->update(
            $investor_contract,
            $request->safe()->except('contract_file'),
            $request->file('contract_file'),
        );

        return to_route('inmopro.investor-contracts.show', $investor_contract)->with('success', 'Contrato actualizado correctamente.');
    }

    public function activate(ActivateInvestorContractRequest $request, InvestorContract $investor_contract): RedirectResponse
    {
        $this->contractService->activate($investor_contract, $request->integer('cash_account_id') ?: null);

        return back()->with('success', 'Contrato activado. El capital se registró como ingreso en caja.');
    }

    public function void(VoidInvestorContractRequest $request, InvestorContract $investor_contract): RedirectResponse
    {
        $this->contractService->void($investor_contract, $request->string('reason')->toString());

        return back()->with('success', 'Contrato anulado correctamente.');
    }

    public function document(InvestorContract $investor_contract): StreamedResponse
    {
        abort_unless(FileStorage::exists($investor_contract->contract_path), 404);

        return FileStorage::filesystem()->response(
            $investor_contract->contract_path,
            basename((string) $investor_contract->contract_path),
        );
    }

    public function export(InvestorContract $investor_contract): BinaryFileResponse
    {
        $investor_contract->load(['investor', 'installments']);

        return Excel::download(
            new InvestorContractScheduleExport($investor_contract),
            sprintf('cronograma-%s.xlsx', $investor_contract->code),
        );
    }

    public function storePayment(StoreInvestorPaymentRequest $request, InvestorContract $investor_contract): RedirectResponse
    {
        $this->contractService->recordPayment(
            $investor_contract,
            $request->safe()->except('voucher_image'),
            $request->file('voucher_image'),
            $request->user()?->id,
        );

        return back()->with('success', 'Pago al inversionista registrado correctamente.');
    }

    public function voucher(InvestorPayment $investor_payment): StreamedResponse
    {
        abort_unless(FileStorage::exists($investor_payment->voucher_path), 404);

        return FileStorage::filesystem()->response(
            $investor_payment->voucher_path,
            basename($investor_payment->voucher_path),
        );
    }

    public function destroyPayment(VoidInvestorPaymentRequest $request, InvestorPayment $investor_payment): RedirectResponse
    {
        $this->contractService->voidPayment($investor_payment, $request->string('reason')->toString());

        return back()->with('success', 'Pago anulado correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
            'cashAccounts' => CashAccount::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'currency']),
            'currencies' => InvestorContract::CURRENCIES,
            'paymentModes' => InvestorContract::PAYMENT_MODES,
            'ratePeriods' => InvestorContract::RATE_PERIODS,
            'frequencies' => ScheduleMath::FREQUENCIES,
        ];
    }
}
