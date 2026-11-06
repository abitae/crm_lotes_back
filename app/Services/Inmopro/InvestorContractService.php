<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\CashEntry;
use App\Models\Inmopro\Investor;
use App\Models\Inmopro\InvestorContract;
use App\Models\Inmopro\InvestorInstallment;
use App\Models\Inmopro\InvestorPayment;
use App\Support\FileStorage;
use App\Support\InstallmentStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class InvestorContractService
{
    private const AMOUNT_TOLERANCE = 0.005;

    public function __construct(
        private InvestorScheduleService $scheduleService
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(Investor $investor, array $validated, ?UploadedFile $document, ?int $userId): InvestorContract
    {
        $storedPath = $document ? FileStorage::storeUploadedFile($document, 'investor-contracts') : null;

        try {
            return DB::transaction(function () use ($investor, $validated, $storedPath, $userId): InvestorContract {
                $contract = $investor->contracts()->make([
                    ...$this->contractAttributes($validated),
                    'code' => $this->nextCode(),
                    'status' => InvestorContract::STATUS_DRAFT,
                    'contract_path' => $storedPath,
                    'created_by' => $userId,
                ]);

                $this->saveWithSchedule($contract, $validated);

                return $contract;
            });
        } catch (Throwable $exception) {
            FileStorage::deleteIfExists($storedPath);

            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(InvestorContract $contract, array $validated, ?UploadedFile $document): InvestorContract
    {
        $this->ensureDraft($contract);

        $storedPath = $document ? FileStorage::storeUploadedFile($document, 'investor-contracts') : null;
        $previousPath = $contract->contract_path;

        try {
            DB::transaction(function () use ($contract, $validated, $storedPath): void {
                $contract->fill($this->contractAttributes($validated));

                if ($storedPath !== null) {
                    $contract->contract_path = $storedPath;
                }

                $contract->installments()->delete();
                $this->saveWithSchedule($contract, $validated);
            });
        } catch (Throwable $exception) {
            FileStorage::deleteIfExists($storedPath);

            throw $exception;
        }

        if ($storedPath !== null) {
            FileStorage::deleteIfExists($previousPath);
        }

        return $contract->refresh();
    }

    /**
     * Activa el contrato: registra el ingreso del capital en caja y fija el cronograma.
     */
    public function activate(InvestorContract $contract, ?int $cashAccountId): InvestorContract
    {
        return DB::transaction(function () use ($contract, $cashAccountId): InvestorContract {
            $locked = $this->lockContract($contract->id);
            $this->ensureDraft($locked);

            $cashAccountId ??= $locked->cash_account_id;

            if ($cashAccountId === null) {
                throw ValidationException::withMessages([
                    'cash_account_id' => 'Seleccione la caja donde ingresó el dinero del inversionista.',
                ]);
            }

            $cashAccount = $this->lockCashAccount($cashAccountId, $locked->currency);
            $principal = (float) $locked->principal_amount;
            $cashAccount->increment('current_balance', $principal);

            CashEntry::create([
                'cash_account_id' => $cashAccount->id,
                'investor_contract_id' => $locked->id,
                'type' => 'INGRESO',
                'concept' => sprintf('Capital recibido contrato %s', $locked->code),
                'amount' => $principal,
                'entry_date' => $locked->received_at->toDateString(),
                'reference' => $locked->code,
            ]);

            $locked->update([
                'cash_account_id' => $cashAccount->id,
                'status' => InvestorContract::STATUS_ACTIVE,
                'activated_at' => now(),
            ]);

            $locked->installments->each(fn (InvestorInstallment $installment) => $this->refreshInstallment($installment, true));

            return $locked;
        });
    }

    /**
     * Anula un contrato sin pagos. Si estaba vigente, revierte el ingreso del capital.
     */
    public function void(InvestorContract $contract, string $reason): InvestorContract
    {
        return DB::transaction(function () use ($contract, $reason): InvestorContract {
            $locked = $this->lockContract($contract->id);

            if (! in_array($locked->status, [InvestorContract::STATUS_DRAFT, InvestorContract::STATUS_ACTIVE], true)) {
                throw ValidationException::withMessages(['reason' => 'Solo se pueden anular contratos en borrador o vigentes.']);
            }

            if ($locked->payments()->exists()) {
                throw ValidationException::withMessages(['reason' => 'No se puede anular un contrato que tiene pagos. Anule primero los pagos.']);
            }

            if ($locked->status === InvestorContract::STATUS_ACTIVE && $locked->cash_account_id !== null) {
                $principal = (float) $locked->principal_amount;
                $cashAccount = $this->lockCashAccount($locked->cash_account_id, $locked->currency, false);
                $this->ensureCashBalance($cashAccount, $principal, 'reason');
                $cashAccount->decrement('current_balance', $principal);

                CashEntry::create([
                    'cash_account_id' => $cashAccount->id,
                    'investor_contract_id' => $locked->id,
                    'type' => 'EGRESO',
                    'concept' => sprintf('Anulación contrato %s', $locked->code),
                    'amount' => $principal,
                    'entry_date' => today()->toDateString(),
                    'reference' => $locked->code,
                    'notes' => mb_substr($reason, 0, 255),
                ]);
            }

            $locked->update([
                'status' => InvestorContract::STATUS_VOIDED,
                'voided_at' => now(),
                'void_reason' => mb_substr($reason, 0, 255),
            ]);

            return $locked;
        });
    }

    /**
     * Registra un pago al inversionista (egreso de caja) y lo aplica a las cuotas.
     * Sin cuota elegida, se aplica a las más antiguas. Dentro de cada cuota se cubre primero el interés.
     *
     * @param  array<string, mixed>  $validated
     */
    public function recordPayment(InvestorContract $contract, array $validated, UploadedFile $voucher, ?int $userId): InvestorPayment
    {
        $storedPath = FileStorage::storeUploadedFile($voucher, 'investor-payments');

        try {
            return DB::transaction(function () use ($contract, $validated, $storedPath, $userId): InvestorPayment {
                $locked = $this->lockContract($contract->id);

                if ($locked->status !== InvestorContract::STATUS_ACTIVE) {
                    throw ValidationException::withMessages(['amount' => 'Solo se pueden registrar pagos en contratos vigentes.']);
                }

                $amount = round((float) $validated['amount'], 2);
                $outstanding = $this->outstanding($locked);

                if ($amount > $outstanding + self::AMOUNT_TOLERANCE) {
                    throw ValidationException::withMessages([
                        'amount' => sprintf('El pago supera lo que se adeuda al inversionista (%s).', number_format($outstanding, 2)),
                    ]);
                }

                if (! empty($validated['investor_installment_id'])) {
                    /** @var InvestorInstallment $selected */
                    $selected = $locked->installments()->whereKey($validated['investor_installment_id'])->lockForUpdate()->firstOrFail();

                    if ($selected->balance() <= 0) {
                        throw ValidationException::withMessages(['investor_installment_id' => 'La cuota seleccionada ya está pagada.']);
                    }

                    if ($amount > $selected->balance() + self::AMOUNT_TOLERANCE) {
                        throw ValidationException::withMessages([
                            'amount' => sprintf('El pago supera el saldo de la cuota (%s).', number_format($selected->balance(), 2)),
                        ]);
                    }

                    $targets = new Collection([$selected]);
                } else {
                    $targets = $this->unpaidInstallmentsOldestFirst($locked);
                }

                $plan = $this->planAllocations($targets, $amount);
                $interestPaid = round(array_sum(array_column($plan, 'interest_amount')), 2);
                $withholding = round($interestPaid * ((float) $locked->withholding_percent) / 100, 2);
                $net = round($amount - $withholding, 2);

                $cashAccount = $this->lockCashAccount((int) $validated['cash_account_id'], $locked->currency);
                $this->ensureCashBalance($cashAccount, $net, 'cash_account_id');

                $payment = $locked->payments()->create([
                    'cash_account_id' => $cashAccount->id,
                    'amount' => $amount,
                    'withholding_amount' => $withholding,
                    'net_amount' => $net,
                    'paid_at' => $validated['paid_at'],
                    'payment_method' => $validated['payment_method'],
                    'reference' => $validated['reference'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'voucher_path' => $storedPath,
                    'created_by' => $userId,
                ]);

                foreach ($plan as $allocation) {
                    $installment = $allocation['installment'];
                    $payment->allocations()->create([
                        'investor_installment_id' => $installment->id,
                        'amount' => $allocation['amount'],
                        'interest_amount' => $allocation['interest_amount'],
                        'principal_amount' => $allocation['principal_amount'],
                    ]);
                    $installment->paid_amount = round((float) $installment->paid_amount + $allocation['amount'], 2);
                    $this->refreshInstallment($installment, true);
                }

                $cashAccount->decrement('current_balance', $net);

                CashEntry::create([
                    'cash_account_id' => $cashAccount->id,
                    'investor_contract_id' => $locked->id,
                    'investor_payment_id' => $payment->id,
                    'type' => 'EGRESO',
                    'concept' => sprintf('Pago a inversionista contrato %s', $locked->code),
                    'amount' => $net,
                    'entry_date' => $validated['paid_at'],
                    'reference' => $validated['reference'] ?? null,
                    'notes' => $withholding > 0 ? sprintf('Retención %s', number_format($withholding, 2)) : null,
                ]);

                $this->syncContractStatus($locked);

                return $payment;
            });
        } catch (Throwable $exception) {
            FileStorage::deleteIfExists($storedPath);

            throw $exception;
        }
    }

    /**
     * Anula un pago: revierte las cuotas y devuelve el monto neto a la caja.
     */
    public function voidPayment(InvestorPayment $payment, string $reason): void
    {
        $voucherPath = DB::transaction(function () use ($payment, $reason): ?string {
            $locked = $this->lockContract($payment->investor_contract_id);

            if ($locked->status === InvestorContract::STATUS_VOIDED) {
                throw ValidationException::withMessages(['reason' => 'El contrato está anulado.']);
            }

            /** @var InvestorPayment $lockedPayment */
            $lockedPayment = InvestorPayment::query()->with('allocations.installment')->lockForUpdate()->findOrFail($payment->id);

            foreach ($lockedPayment->allocations as $allocation) {
                $installment = $allocation->installment;
                $installment->paid_amount = max(0, round((float) $installment->paid_amount - (float) $allocation->amount, 2));
                $this->refreshInstallment($installment, true);
            }

            $net = (float) $lockedPayment->net_amount;
            $cashAccount = $this->lockCashAccount($lockedPayment->cash_account_id, $locked->currency, false);
            $cashAccount->increment('current_balance', $net);

            CashEntry::create([
                'cash_account_id' => $cashAccount->id,
                'investor_contract_id' => $locked->id,
                'type' => 'INGRESO',
                'concept' => sprintf('Anulación de pago a inversionista contrato %s', $locked->code),
                'amount' => $net,
                'entry_date' => today()->toDateString(),
                'reference' => $lockedPayment->reference,
                'notes' => mb_substr($reason, 0, 255),
            ]);

            $voucherPath = $lockedPayment->voucher_path;
            $lockedPayment->delete();

            $this->syncContractStatus($locked);

            return $voucherPath;
        });

        FileStorage::deleteIfExists($voucherPath);
    }

    public function outstanding(InvestorContract $contract): float
    {
        return round((float) $contract->installments()->get()->sum(fn (InvestorInstallment $installment): float => $installment->balance()), 2);
    }

    public function markOverdueInstallments(): int
    {
        return InvestorInstallment::query()
            ->where('status', InstallmentStatus::PENDIENTE)
            ->whereDate('due_date', '<', today())
            ->whereHas('contract', fn ($query) => $query->where('status', InvestorContract::STATUS_ACTIVE))
            ->update(['status' => InstallmentStatus::VENCIDA]);
    }

    /**
     * @param  Collection<int, InvestorInstallment>  $installments
     * @return list<array{installment: InvestorInstallment, amount: float, interest_amount: float, principal_amount: float}>
     */
    private function planAllocations(Collection $installments, float $amount): array
    {
        $remaining = (int) round($amount * 100);
        $plan = [];

        foreach ($installments as $installment) {
            if ($remaining <= 0) {
                break;
            }

            $balance = (int) round($installment->balance() * 100);

            if ($balance <= 0) {
                continue;
            }

            $paidInterest = (int) round((float) $installment->allocations()->sum('interest_amount') * 100);
            $interestDue = max(0, (int) round((float) $installment->interest_amount * 100) - $paidInterest);
            $applied = min($remaining, $balance);
            $interest = min($applied, $interestDue);

            $plan[] = [
                'installment' => $installment,
                'amount' => $applied / 100,
                'interest_amount' => $interest / 100,
                'principal_amount' => ($applied - $interest) / 100,
            ];
            $remaining -= $applied;
        }

        return $plan;
    }

    /**
     * @return Collection<int, InvestorInstallment>
     */
    private function unpaidInstallmentsOldestFirst(InvestorContract $contract): Collection
    {
        return InvestorInstallment::query()
            ->where('investor_contract_id', $contract->id)
            ->whereColumn('paid_amount', '<', 'amount')
            ->orderBy('due_date')
            ->orderBy('sequence')
            ->lockForUpdate()
            ->get();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function saveWithSchedule(InvestorContract $contract, array $validated): void
    {
        $rows = ! empty($validated['installments'])
            ? $this->scheduleService->normalizeCustom($validated['installments'], (float) $validated['principal_amount'])
            : $this->scheduleService->build($validated);

        $totalInterest = round(array_sum(array_column($rows, 'interest_amount')), 2);
        $contract->fill([
            'installments_count' => count($rows),
            'first_due_date' => $rows[0]['due_date'],
            'total_interest' => $totalInterest,
            'total_payable' => round((float) $contract->principal_amount + $totalInterest, 2),
        ]);
        $contract->save();

        foreach ($rows as $row) {
            $contract->installments()->create([
                ...$row,
                'paid_amount' => 0,
                'status' => InstallmentStatus::PENDIENTE,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function contractAttributes(array $validated): array
    {
        return [
            'project_id' => $validated['project_id'] ?? null,
            'currency' => $validated['currency'],
            'principal_amount' => round((float) $validated['principal_amount'], 2),
            'received_at' => $validated['received_at'],
            'cash_account_id' => $validated['cash_account_id'] ?? null,
            'rate_percent' => $validated['rate_percent'],
            'rate_period' => $validated['rate_period'],
            'payment_mode' => $validated['payment_mode'],
            'term_months' => (int) $validated['term_months'],
            'installments_count' => (int) ($validated['installments_count'] ?? 1),
            'frequency' => $validated['frequency'],
            'first_due_date' => $validated['first_due_date'],
            'withholding_percent' => $validated['withholding_percent'] ?? 0,
            'signed_at' => $validated['signed_at'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];
    }

    private function refreshInstallment(InvestorInstallment $installment, bool $active): void
    {
        $status = InstallmentStatus::resolve((float) $installment->amount, (float) $installment->paid_amount, $installment->due_date);

        $installment->status = ! $active && $status === InstallmentStatus::VENCIDA ? InstallmentStatus::PENDIENTE : $status;
        $installment->save();
    }

    private function syncContractStatus(InvestorContract $contract): void
    {
        $settled = $this->outstanding($contract) <= 0;

        if ($settled && $contract->status === InvestorContract::STATUS_ACTIVE) {
            $contract->update(['status' => InvestorContract::STATUS_SETTLED, 'settled_at' => now()]);
        }

        if (! $settled && $contract->status === InvestorContract::STATUS_SETTLED) {
            $contract->update(['status' => InvestorContract::STATUS_ACTIVE, 'settled_at' => null]);
        }
    }

    private function ensureDraft(InvestorContract $contract): void
    {
        if (! $contract->isEditable()) {
            throw ValidationException::withMessages(['status' => 'Solo se puede modificar un contrato en borrador.']);
        }
    }

    private function ensureCashBalance(CashAccount $cashAccount, float $amount, string $field): void
    {
        if ((float) $cashAccount->current_balance + self::AMOUNT_TOLERANCE < $amount) {
            throw ValidationException::withMessages([
                $field => sprintf(
                    'La caja %s no tiene saldo suficiente (disponible %s).',
                    $cashAccount->name,
                    number_format((float) $cashAccount->current_balance, 2),
                ),
            ]);
        }
    }

    private function lockCashAccount(int $cashAccountId, string $currency, bool $mustBeActive = true): CashAccount
    {
        /** @var CashAccount $cashAccount */
        $cashAccount = CashAccount::query()->lockForUpdate()->findOrFail($cashAccountId);

        if ($mustBeActive && ! $cashAccount->is_active) {
            throw ValidationException::withMessages(['cash_account_id' => 'La caja seleccionada está inactiva.']);
        }

        if ($cashAccount->currency !== $currency) {
            throw ValidationException::withMessages([
                'cash_account_id' => sprintf('La caja está en %s y el contrato en %s.', $cashAccount->currency, $currency),
            ]);
        }

        return $cashAccount;
    }

    private function lockContract(int $contractId): InvestorContract
    {
        /** @var InvestorContract $contract */
        $contract = InvestorContract::query()->lockForUpdate()->findOrFail($contractId);

        return $contract;
    }

    private function nextCode(): string
    {
        $prefix = sprintf('INV-%s-', now()->format('Y'));
        $last = InvestorContract::query()->where('code', 'like', $prefix.'%')->lockForUpdate()->max('code');
        $next = $last ? ((int) substr((string) $last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
