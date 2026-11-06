<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotInstallment;
use App\Models\Inmopro\LotPaymentPlan;
use App\Models\Inmopro\LotStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentScheduleService
{
    public const MODE_APPEND = 'AGREGAR';

    public const MODE_REPLACE = 'REPROGRAMAR';

    /**
     * @var list<string>
     */
    public const MODES = [self::MODE_APPEND, self::MODE_REPLACE];

    public function __construct(
        private ReceivableService $receivableService
    ) {}

    /**
     * Reparte un monto en N cuotas: todas iguales, truncadas al céntimo, y la última absorbe la diferencia.
     *
     * @return list<array{sequence_offset: int, due_date: string, amount: float}>
     */
    public function buildInstallments(float $financedAmount, int $count, string $frequency, string $firstDueDate): array
    {
        $totalCents = (int) round($financedAmount * 100);
        $baseCents = intdiv($totalCents, $count);
        $firstDate = CarbonImmutable::parse($firstDueDate)->startOfDay();
        $rows = [];

        for ($index = 0; $index < $count; $index++) {
            $cents = $index === $count - 1
                ? $totalCents - ($baseCents * ($count - 1))
                : $baseCents;

            $rows[] = [
                'sequence_offset' => $index + 1,
                'due_date' => $this->dueDate($firstDate, $frequency, $index)->toDateString(),
                'amount' => $cents / 100,
            ];
        }

        return $rows;
    }

    /**
     * Monto que aún puede programarse: saldo del lote menos lo pendiente de las cuotas que se conservan.
     */
    public function schedulableAmount(Lot $lot, string $mode): float
    {
        $keptInstallments = $lot->installments()->get()
            ->when($mode === self::MODE_REPLACE, fn ($installments) => $installments->filter(
                fn (LotInstallment $installment): bool => (float) $installment->paid_amount > 0,
            ));

        $scheduledBalance = (float) $keptInstallments->sum(fn (LotInstallment $installment): float => $installment->balance());

        return max(0, round($this->receivableService->outstandingBalance($lot) - $scheduledBalance, 2));
    }

    /**
     * @param  array{installments_count: int|string, frequency: string, first_due_date: string, mode: string, financed_amount?: float|string|null, notes?: string|null}  $validated
     */
    public function generate(Lot $lot, array $validated, ?int $userId): LotPaymentPlan
    {
        return DB::transaction(function () use ($lot, $validated, $userId): LotPaymentPlan {
            /** @var Lot $lockedLot */
            $lockedLot = Lot::query()->whereKey($lot->id)->lockForUpdate()->firstOrFail();
            $lockedLot->load('status');

            if ($lockedLot->status?->code !== LotStatus::CODE_CUOTAS) {
                throw ValidationException::withMessages([
                    'installments_count' => 'Solo se puede generar un cronograma para lotes en estado CUOTAS.',
                ]);
            }

            $mode = $validated['mode'];
            $count = (int) $validated['installments_count'];
            $available = $this->schedulableAmount($lockedLot, $mode);
            $financedAmount = isset($validated['financed_amount']) && $validated['financed_amount'] !== null && $validated['financed_amount'] !== ''
                ? round((float) $validated['financed_amount'], 2)
                : $available;

            if ($financedAmount <= 0) {
                throw ValidationException::withMessages([
                    'financed_amount' => 'El lote no tiene saldo disponible para programar.',
                ]);
            }

            if ($financedAmount > $available + 0.005) {
                throw ValidationException::withMessages([
                    'financed_amount' => sprintf(
                        'El monto a financiar supera el saldo disponible para programar (S/ %s).',
                        number_format($available, 2),
                    ),
                ]);
            }

            if ($financedAmount < $count * 0.01) {
                throw ValidationException::withMessages([
                    'installments_count' => 'El monto es demasiado bajo para esa cantidad de cuotas.',
                ]);
            }

            if ($mode === self::MODE_REPLACE) {
                $this->retireCurrentSchedule($lockedLot);
            }

            $plan = $lockedLot->paymentPlans()->create([
                'financed_amount' => $financedAmount,
                'installments_count' => $count,
                'frequency' => $validated['frequency'],
                'first_due_date' => $validated['first_due_date'],
                'status' => LotPaymentPlan::STATUS_ACTIVE,
                'created_by' => $userId,
                'notes' => $validated['notes'] ?? null,
            ]);

            $lastSequence = (int) $lockedLot->installments()->max('sequence');

            foreach ($this->buildInstallments($financedAmount, $count, $validated['frequency'], $validated['first_due_date']) as $row) {
                $installment = $lockedLot->installments()->make([
                    'lot_payment_plan_id' => $plan->id,
                    'sequence' => $lastSequence + $row['sequence_offset'],
                    'due_date' => $row['due_date'],
                    'amount' => $row['amount'],
                    'paid_amount' => 0,
                ]);
                $this->receivableService->refreshInstallmentStatus($installment);
                $installment->save();
            }

            $this->receivableService->syncLotBalances($lockedLot);

            return $plan;
        });
    }

    /**
     * Marca los planes activos como reemplazados y elimina las cuotas sin ningún pago.
     * Las cuotas pagadas o parciales se conservan.
     */
    private function retireCurrentSchedule(Lot $lot): void
    {
        $lot->paymentPlans()
            ->where('status', LotPaymentPlan::STATUS_ACTIVE)
            ->update(['status' => LotPaymentPlan::STATUS_REPLACED, 'replaced_at' => now()]);

        $lot->installments()
            ->where('paid_amount', '<=', 0)
            ->whereDoesntHave('allocations')
            ->whereDoesntHave('payments')
            ->delete();
    }

    private function dueDate(CarbonImmutable $firstDate, string $frequency, int $index): CarbonImmutable
    {
        return match ($frequency) {
            LotPaymentPlan::FREQUENCY_BIWEEKLY => $firstDate->addDays(15 * $index),
            LotPaymentPlan::FREQUENCY_WEEKLY => $firstDate->addWeeks($index),
            default => $firstDate->addMonthsNoOverflow($index),
        };
    }
}
