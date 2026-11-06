<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\AdvisorMembership;
use App\Models\Inmopro\AdvisorMembershipInstallment;
use App\Models\Inmopro\AdvisorMembershipPayment;
use App\Models\Inmopro\CashAccount;
use App\Models\Inmopro\CashEntry;
use App\Support\InstallmentStatus;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MembershipReceivableService
{
    /**
     * Crea N cuotas repartiendo un principal dado. Las fechas de vencimiento se reparten de forma
     * proporcional entre start_date y end_date de la membresía (la última cuota vence en end_date).
     */
    public function createInstallmentsForAmount(AdvisorMembership $membership, int $count, float $principal): void
    {
        if ($count < 1 || $principal <= 0) {
            return;
        }

        $perInstallment = round($principal / $count, 2);
        $start = $membership->start_date ? Carbon::parse($membership->start_date)->startOfDay() : null;
        $end = $membership->end_date ? Carbon::parse($membership->end_date)->startOfDay() : null;

        DB::transaction(function () use ($membership, $count, $perInstallment, $principal, $start, $end): void {
            for ($seq = 1; $seq <= $count; $seq++) {
                $amount = $seq === $count
                    ? $principal - ($perInstallment * ($count - 1))
                    : $perInstallment;

                $dueDate = $this->installmentDueDateBetween($start, $end, $seq, $count);

                $membership->installments()->create([
                    'sequence' => $seq,
                    'due_date' => $dueDate,
                    'amount' => $amount,
                    'paid_amount' => 0,
                    'status' => InstallmentStatus::PENDIENTE,
                ]);
            }
        });
    }

    /**
     * Reparto proporcional en días: cuota k/N cae en start + round(k/N * días_totales), salvo la N en end_date.
     */
    private function installmentDueDateBetween(?Carbon $start, ?Carbon $end, int $sequence, int $count): ?Carbon
    {
        if (! $start || ! $end) {
            return null;
        }

        if ($sequence === $count) {
            return $end->copy();
        }

        $totalDays = max(0, $start->diffInDays($end));
        if ($totalDays === 0) {
            return $start->copy();
        }

        $offsetDays = (int) floor($totalDays * $sequence / $count);
        if ($offsetDays < 1 && $sequence >= 1) {
            $offsetDays = 1;
        }

        return $start->copy()->addDays(min($offsetDays, $totalDays));
    }

    /**
     * Crea N cuotas para el monto total de la membresía (compatibilidad).
     */
    public function createInstallments(AdvisorMembership $membership, int $count): void
    {
        $this->createInstallmentsForAmount($membership, $count, (float) $membership->amount);
    }

    /**
     * Registra un pago de membresía; opcionalmente asocia a una cuota y/o a una cuenta de caja.
     */
    public function recordPayment(AdvisorMembership $membership, array $validated): AdvisorMembershipPayment
    {
        return DB::transaction(function () use ($membership, $validated): AdvisorMembershipPayment {
            $payment = $membership->payments()->create([
                'advisor_membership_installment_id' => $validated['advisor_membership_installment_id'] ?? null,
                'cash_account_id' => $validated['cash_account_id'] ?? null,
                'amount' => $validated['amount'],
                'paid_at' => $validated['paid_at'],
                'notes' => $validated['notes'] ?? null,
            ]);

            if (! empty($validated['advisor_membership_installment_id'])) {
                $installment = AdvisorMembershipInstallment::query()
                    ->where('advisor_membership_id', $membership->id)
                    ->findOrFail($validated['advisor_membership_installment_id']);
                $installment->paid_amount = (float) $installment->paid_amount + (float) $validated['amount'];
                $this->refreshMembershipInstallmentStatus($installment);
                $installment->save();
            }

            if (! empty($validated['cash_account_id'])) {
                $cashAccount = CashAccount::findOrFail($validated['cash_account_id']);
                $cashAccount->increment('current_balance', (float) $validated['amount']);
                $advisorName = $membership->advisor?->name ?? 'Vendedor';
                CashEntry::create([
                    'cash_account_id' => $cashAccount->id,
                    'advisor_membership_payment_id' => $payment->id,
                    'type' => 'INGRESO',
                    'concept' => sprintf('Pago membresía - %s', $advisorName),
                    'amount' => $validated['amount'],
                    'entry_date' => $validated['paid_at'],
                    'reference' => $validated['reference'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ]);
            }

            return $payment;
        });
    }

    public function refreshMembershipInstallmentStatus(AdvisorMembershipInstallment $installment): void
    {
        $installment->status = InstallmentStatus::resolve(
            (float) $installment->amount,
            (float) $installment->paid_amount,
            $installment->due_date,
        );
    }
}
