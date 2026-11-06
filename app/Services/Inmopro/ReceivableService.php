<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\CashEntry;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotInstallment;
use App\Models\Inmopro\LotPayment;
use App\Models\Inmopro\LotPaymentAllocation;
use App\Models\Inmopro\LotStatus;
use App\Support\FileStorage;
use App\Support\InstallmentStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceivableService
{
    private const AMOUNT_TOLERANCE = 0.005;

    public function createInstallment(Lot $lot, array $validated): LotInstallment
    {
        return DB::transaction(function () use ($lot, $validated): LotInstallment {
            $lockedLot = $this->lockLot($lot->id);

            if ($lockedLot->status?->code !== LotStatus::CODE_CUOTAS) {
                throw ValidationException::withMessages([
                    'amount' => 'Solo se pueden generar cuotas para lotes en estado CUOTAS.',
                ]);
            }

            $amount = round((float) $validated['amount'], 2);
            $available = $this->outstandingBalance($lockedLot) - $this->unpaidScheduledAmount($lockedLot);

            if ($amount > $available + self::AMOUNT_TOLERANCE) {
                throw ValidationException::withMessages([
                    'amount' => sprintf(
                        'El cronograma supera el saldo pendiente del lote. Disponible para programar: S/ %s.',
                        number_format(max(0, $available), 2),
                    ),
                ]);
            }

            $sequence = ((int) $lockedLot->installments()->max('sequence')) + 1;

            $installment = $lockedLot->installments()->make([
                'sequence' => $sequence,
                'due_date' => $validated['due_date'],
                'amount' => $amount,
                'paid_amount' => 0,
                'notes' => $validated['notes'] ?? null,
            ]);
            $this->refreshInstallmentStatus($installment);
            $installment->save();

            $this->syncLotBalances($lockedLot);

            return $installment;
        });
    }

    public function recordPayment(Lot $lot, array $validated, UploadedFile $voucherImage): LotPayment
    {
        $storedPath = FileStorage::storeUploadedFile($voucherImage, 'lot-payments');

        try {
            return DB::transaction(function () use ($lot, $validated, $storedPath): LotPayment {
                $lockedLot = $this->lockLot($lot->id);
                $amount = round((float) $validated['amount'], 2);

                $this->ensureLotAcceptsPayments($lockedLot);

                $outstanding = $this->outstandingBalance($lockedLot);

                if ($amount > $outstanding + self::AMOUNT_TOLERANCE) {
                    throw ValidationException::withMessages([
                        'amount' => sprintf(
                            'El abono supera el saldo pendiente del lote (S/ %s).',
                            number_format($outstanding, 2),
                        ),
                    ]);
                }

                $selectedInstallment = null;

                if (! empty($validated['lot_installment_id'])) {
                    /** @var LotInstallment $selectedInstallment */
                    $selectedInstallment = LotInstallment::query()
                        ->where('lot_id', $lockedLot->id)
                        ->lockForUpdate()
                        ->findOrFail($validated['lot_installment_id']);

                    $installmentBalance = $selectedInstallment->balance();

                    if ($selectedInstallment->status === InstallmentStatus::PAGADA || $installmentBalance <= 0) {
                        throw ValidationException::withMessages([
                            'lot_installment_id' => 'La cuota seleccionada ya está pagada.',
                        ]);
                    }

                    if ($amount > $installmentBalance + self::AMOUNT_TOLERANCE) {
                        throw ValidationException::withMessages([
                            'amount' => sprintf(
                                'El abono supera el saldo de la cuota (S/ %s).',
                                number_format($installmentBalance, 2),
                            ),
                        ]);
                    }
                }

                $payment = LotPayment::create([
                    'lot_id' => $lockedLot->id,
                    'lot_installment_id' => $selectedInstallment?->id,
                    'cash_account_id' => $validated['cash_account_id'] ?? null,
                    'amount' => $amount,
                    'paid_at' => $validated['paid_at'],
                    'payment_method' => $validated['payment_method'],
                    'reference' => $validated['reference'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'voucher_path' => $storedPath,
                ]);

                $installmentsToApply = $selectedInstallment !== null
                    ? new Collection([$selectedInstallment])
                    : $this->unpaidInstallmentsOldestFirst($lockedLot);

                $this->allocatePayment($payment, $installmentsToApply, $amount);

                if (! empty($validated['cash_account_id'])) {
                    /** @var CashAccount $cashAccount */
                    $cashAccount = CashAccount::query()->lockForUpdate()->findOrFail($validated['cash_account_id']);
                    $cashAccount->increment('current_balance', $amount);

                    CashEntry::create([
                        'cash_account_id' => $cashAccount->id,
                        'lot_payment_id' => $payment->id,
                        'type' => 'INGRESO',
                        'concept' => sprintf('Pago lote %s-%s', $lockedLot->block, $lockedLot->number),
                        'amount' => $amount,
                        'entry_date' => $validated['paid_at'],
                        'reference' => $validated['reference'] ?? null,
                        'notes' => $validated['notes'] ?? null,
                    ]);
                }

                $lockedLot->advance = round((float) ($lockedLot->advance ?? 0) + $amount, 2);
                $this->syncLotBalances($lockedLot);

                return $payment;
            });
        } catch (\Throwable $exception) {
            FileStorage::deleteIfExists($storedPath);

            throw $exception;
        }
    }

    /**
     * Anula un abono: revierte la cuota, la caja (con un egreso de reverso) y el saldo del lote.
     */
    public function voidPayment(LotPayment $payment, string $reason): void
    {
        $voucherPath = DB::transaction(function () use ($payment, $reason): ?string {
            /** @var LotPayment $lockedPayment */
            $lockedPayment = LotPayment::query()->lockForUpdate()->findOrFail($payment->id);
            $lockedLot = $this->lockLot($lockedPayment->lot_id);

            if ($lockedLot->status?->code === LotStatus::CODE_TRANSFERIDO) {
                throw ValidationException::withMessages([
                    'reason' => 'No se pueden anular abonos de un lote transferido.',
                ]);
            }

            $amount = (float) $lockedPayment->amount;
            $allocations = $lockedPayment->allocations()->get();

            if ($allocations->isEmpty() && $lockedPayment->lot_installment_id !== null) {
                $allocations = collect([new LotPaymentAllocation([
                    'lot_installment_id' => $lockedPayment->lot_installment_id,
                    'amount' => $amount,
                ])]);
            }

            foreach ($allocations as $allocation) {
                $installment = LotInstallment::query()->lockForUpdate()->find($allocation->lot_installment_id);

                if ($installment !== null) {
                    $installment->paid_amount = max(0, round((float) $installment->paid_amount - (float) $allocation->amount, 2));
                    $this->refreshInstallmentStatus($installment);
                    $installment->save();
                }
            }

            if ($lockedPayment->cash_account_id !== null) {
                $cashAccount = CashAccount::query()->lockForUpdate()->find($lockedPayment->cash_account_id);

                if ($cashAccount !== null) {
                    $cashAccount->decrement('current_balance', $amount);

                    CashEntry::create([
                        'cash_account_id' => $cashAccount->id,
                        'type' => 'EGRESO',
                        'concept' => sprintf('Anulación pago lote %s-%s', $lockedLot->block, $lockedLot->number),
                        'amount' => $amount,
                        'entry_date' => today()->toDateString(),
                        'reference' => $lockedPayment->reference,
                        'notes' => $reason,
                    ]);
                }
            }

            $lockedLot->advance = max(0, round((float) ($lockedLot->advance ?? 0) - $amount, 2));
            $this->syncLotBalances($lockedLot);

            $voucherPath = $lockedPayment->voucher_path;
            $lockedPayment->delete();

            return $voucherPath;
        });

        FileStorage::deleteIfExists($voucherPath);
    }

    public function recordManualEntry(CashAccount $cashAccount, array $validated): CashEntry
    {
        return DB::transaction(function () use ($cashAccount, $validated): CashEntry {
            $entry = $cashAccount->entries()->create($validated);
            $delta = $validated['type'] === 'EGRESO'
                ? -(float) $validated['amount']
                : (float) $validated['amount'];

            $cashAccount->increment('current_balance', $delta);

            return $entry;
        });
    }

    /**
     * Recalcula el saldo del lote a partir de su precio de venta y del adelanto acumulado
     * (que incluye el adelanto de pre-reserva y todos los abonos), y refresca el estado de sus cuotas.
     */
    public function syncLotBalances(Lot $lot): void
    {
        $advance = round((float) ($lot->advance ?? 0), 2);

        $lot->forceFill([
            'advance' => $advance,
            'remaining_balance' => max(0, round($this->salePrice($lot) - $advance, 2)),
        ])->save();

        foreach ($lot->installments()->get() as $installment) {
            $this->refreshInstallmentStatus($installment);

            if ($installment->isDirty('status')) {
                $installment->save();
            }
        }
    }

    public function refreshInstallmentStatus(LotInstallment $installment): void
    {
        $installment->status = InstallmentStatus::resolve(
            (float) $installment->amount,
            (float) $installment->paid_amount,
            $installment->due_date,
        );
    }

    /**
     * Marca como VENCIDA toda cuota PENDIENTE cuya fecha de vencimiento ya pasó.
     */
    public function markOverdueInstallments(): int
    {
        return LotInstallment::query()
            ->where('status', InstallmentStatus::PENDIENTE)
            ->whereDate('due_date', '<', today()->toDateString())
            ->update(['status' => InstallmentStatus::VENCIDA, 'updated_at' => now()]);
    }

    public function outstandingBalance(Lot $lot): float
    {
        return max(0, round($this->salePrice($lot) - (float) ($lot->advance ?? 0), 2));
    }

    public function canReceivePayments(Lot $lot): bool
    {
        return $lot->status?->code !== LotStatus::CODE_TRANSFERIDO
            && $this->outstandingBalance($lot) > 0;
    }

    /**
     * Cuotas con saldo, de la más antigua a la más reciente, bloqueadas para el abono.
     *
     * @return Collection<int, LotInstallment>
     */
    private function unpaidInstallmentsOldestFirst(Lot $lot): Collection
    {
        return LotInstallment::query()
            ->where('lot_id', $lot->id)
            ->whereColumn('paid_amount', '<', 'amount')
            ->orderBy('due_date')
            ->orderBy('sequence')
            ->lockForUpdate()
            ->get();
    }

    /**
     * Reparte el abono entre las cuotas en el orden dado. Lo que sobra queda como abono al saldo del lote.
     *
     * @param  Collection<int, LotInstallment>  $installments
     */
    private function allocatePayment(LotPayment $payment, Collection $installments, float $amount): void
    {
        $remaining = $amount;

        foreach ($installments as $installment) {
            if ($remaining <= 0) {
                break;
            }

            $applied = round(min($remaining, $installment->balance()), 2);

            if ($applied <= 0) {
                continue;
            }

            $payment->allocations()->create([
                'lot_installment_id' => $installment->id,
                'amount' => $applied,
            ]);

            $installment->paid_amount = round((float) $installment->paid_amount + $applied, 2);
            $this->refreshInstallmentStatus($installment);
            $installment->save();

            $remaining = round($remaining - $applied, 2);
        }
    }

    private function ensureLotAcceptsPayments(Lot $lot): void
    {
        if ($lot->status?->code === LotStatus::CODE_TRANSFERIDO) {
            throw ValidationException::withMessages([
                'amount' => 'No se pueden registrar abonos en un lote transferido.',
            ]);
        }

        if ($this->outstandingBalance($lot) <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'El lote no tiene saldo pendiente.',
            ]);
        }
    }

    private function unpaidScheduledAmount(Lot $lot): float
    {
        return (float) $lot->installments()->get()->sum(
            fn (LotInstallment $installment): float => max(0, (float) $installment->amount - (float) $installment->paid_amount),
        );
    }

    private function salePrice(Lot $lot): float
    {
        return (float) ($lot->sale_price ?? $lot->price ?? 0);
    }

    private function lockLot(int $lotId): Lot
    {
        /** @var Lot $lot */
        $lot = Lot::query()->whereKey($lotId)->lockForUpdate()->firstOrFail();
        $lot->load('status');

        return $lot;
    }
}
