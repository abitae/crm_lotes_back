<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\CashEntry;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotInstallment;
use App\Models\Inmopro\LotPayment;
use App\Models\Inmopro\LotStatus;
use App\Support\FileStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceivableService
{
    public function createInstallment(Lot $lot, array $validated): LotInstallment
    {
        $lot->loadMissing('status');

        if ($lot->status?->code !== LotStatus::CODE_CUOTAS) {
            throw ValidationException::withMessages([
                'amount' => 'Solo se pueden generar cuotas para lotes en estado CUOTAS.',
            ]);
        }

        $sequence = ((int) $lot->installments()->max('sequence')) + 1;

        $installment = $lot->installments()->create([
            'sequence' => $sequence,
            'due_date' => $validated['due_date'],
            'amount' => $validated['amount'],
            'notes' => $validated['notes'] ?? null,
        ]);

        $this->refreshInstallmentStatus($installment);
        $this->syncLotBalances($lot->fresh());

        return $installment;
    }

    public function recordPayment(Lot $lot, array $validated, UploadedFile $voucherImage): LotPayment
    {
        $storedPath = FileStorage::storeUploadedFile($voucherImage, 'lot-payments');

        try {
            return DB::transaction(function () use ($lot, $validated, $storedPath): LotPayment {
                $payment = LotPayment::create([
                    'lot_id' => $lot->id,
                    'lot_installment_id' => $validated['lot_installment_id'] ?? null,
                    'cash_account_id' => $validated['cash_account_id'] ?? null,
                    'amount' => $validated['amount'],
                    'paid_at' => $validated['paid_at'],
                    'payment_method' => $validated['payment_method'],
                    'reference' => $validated['reference'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'voucher_path' => $storedPath,
                ]);

                if (! empty($validated['lot_installment_id'])) {
                    /** @var LotInstallment $installment */
                    $installment = LotInstallment::query()
                        ->where('lot_id', $lot->id)
                        ->findOrFail($validated['lot_installment_id']);

                    $installment->paid_amount = (float) $installment->paid_amount + (float) $validated['amount'];
                    $this->refreshInstallmentStatus($installment);
                    $installment->save();
                }

                if (! empty($validated['cash_account_id'])) {
                    /** @var CashAccount $cashAccount */
                    $cashAccount = CashAccount::findOrFail($validated['cash_account_id']);
                    $cashAccount->increment('current_balance', (float) $validated['amount']);

                    CashEntry::create([
                        'cash_account_id' => $cashAccount->id,
                        'lot_payment_id' => $payment->id,
                        'type' => 'INGRESO',
                        'concept' => sprintf('Pago lote %s-%s', $lot->block, $lot->number),
                        'amount' => $validated['amount'],
                        'entry_date' => $validated['paid_at'],
                        'reference' => $validated['reference'] ?? null,
                        'notes' => $validated['notes'] ?? null,
                    ]);
                }

                $this->syncLotBalances($lot->fresh());

                return $payment;
            });
        } catch (\Throwable $exception) {
            FileStorage::deleteIfExists($storedPath);

            throw $exception;
        }
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

    public function syncLotBalances(Lot $lot): void
    {
        $totalPaid = (float) $lot->payments()->sum('amount');
        $remainingBalance = max(0, (float) $lot->price - $totalPaid);

        foreach ($lot->installments as $installment) {
            $this->refreshInstallmentStatus($installment);
            $installment->save();
        }

        $lot->update([
            'advance' => $totalPaid,
            'remaining_balance' => $remainingBalance,
        ]);
    }

    public function refreshInstallmentStatus(LotInstallment $installment): void
    {
        if ((float) $installment->paid_amount >= (float) $installment->amount) {
            $installment->status = 'PAGADA';

            return;
        }

        if ((float) $installment->paid_amount > 0) {
            $installment->status = 'PARCIAL';

            return;
        }

        $installment->status = $installment->due_date->isPast() ? 'VENCIDA' : 'PENDIENTE';
    }
}
