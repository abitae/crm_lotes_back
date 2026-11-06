<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\InvestorContract;
use App\Support\ScheduleMath;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/**
 * Calcula la ganancia (interés simple) y el cronograma de pagos de un contrato de inversión.
 */
class InvestorScheduleService
{
    /**
     * Interés simple total: capital × tasa, ajustado al plazo según el periodo de la tasa.
     */
    public function totalInterestCents(float $principal, float $ratePercent, string $ratePeriod, int $termMonths): int
    {
        $factor = match ($ratePeriod) {
            InvestorContract::RATE_MONTHLY => $termMonths,
            InvestorContract::RATE_ANNUAL => $termMonths / 12,
            default => 1,
        };

        return (int) round(ScheduleMath::toCents($principal) * ($ratePercent / 100) * $factor);
    }

    /**
     * @param  array{principal_amount: float|int|string, rate_percent: float|int|string, rate_period: string, term_months: int|string, payment_mode: string, installments_count: int|string, frequency: string, first_due_date: string}  $terms
     * @return list<array{sequence: int, due_date: string, principal_amount: float, interest_amount: float, amount: float}>
     */
    public function build(array $terms): array
    {
        $principalCents = ScheduleMath::toCents($terms['principal_amount']);
        $interestCents = $this->totalInterestCents(
            (float) $terms['principal_amount'],
            (float) $terms['rate_percent'],
            $terms['rate_period'],
            (int) $terms['term_months'],
        );
        $mode = $terms['payment_mode'];
        $count = $mode === InvestorContract::MODE_BULLET ? 1 : max(1, (int) $terms['installments_count']);
        $firstDate = CarbonImmutable::parse($terms['first_due_date'])->startOfDay();

        $interestParts = ScheduleMath::splitCents($interestCents, $count);
        $principalParts = $mode === InvestorContract::MODE_EQUAL
            ? ScheduleMath::splitCents($principalCents, $count)
            : [...array_fill(0, $count - 1, 0), $principalCents];

        $rows = [];

        for ($index = 0; $index < $count; $index++) {
            $rows[] = $this->row(
                $index + 1,
                ScheduleMath::dueDate($firstDate, $terms['frequency'], $index)->toDateString(),
                $principalParts[$index],
                $interestParts[$index],
            );
        }

        return $rows;
    }

    /**
     * Valida un cronograma editado a mano: el capital debe sumar exactamente el monto prestado.
     *
     * @param  list<array{due_date: string, principal_amount: float|int|string|null, interest_amount: float|int|string|null}>  $installments
     * @return list<array{sequence: int, due_date: string, principal_amount: float, interest_amount: float, amount: float}>
     */
    public function normalizeCustom(array $installments, float $principal): array
    {
        $rows = collect($installments)
            ->map(fn (array $row): array => [
                'due_date' => CarbonImmutable::parse($row['due_date'])->toDateString(),
                'principal' => ScheduleMath::toCents($row['principal_amount'] ?? 0),
                'interest' => ScheduleMath::toCents($row['interest_amount'] ?? 0),
            ])
            ->sortBy('due_date')
            ->values();

        if ($rows->sum('principal') !== ScheduleMath::toCents($principal)) {
            throw ValidationException::withMessages([
                'installments' => sprintf(
                    'El capital del cronograma (%s) debe sumar exactamente el monto prestado (%s).',
                    number_format($rows->sum('principal') / 100, 2),
                    number_format($principal, 2),
                ),
            ]);
        }

        if ($rows->contains(fn (array $row): bool => $row['principal'] + $row['interest'] <= 0)) {
            throw ValidationException::withMessages([
                'installments' => 'Cada cuota debe tener un monto mayor a cero.',
            ]);
        }

        return $rows
            ->map(fn (array $row, int $index): array => $this->row($index + 1, $row['due_date'], $row['principal'], $row['interest']))
            ->all();
    }

    /**
     * @return array{sequence: int, due_date: string, principal_amount: float, interest_amount: float, amount: float}
     */
    private function row(int $sequence, string $dueDate, int $principalCents, int $interestCents): array
    {
        return [
            'sequence' => $sequence,
            'due_date' => $dueDate,
            'principal_amount' => round($principalCents / 100, 2),
            'interest_amount' => round($interestCents / 100, 2),
            'amount' => round(($principalCents + $interestCents) / 100, 2),
        ];
    }
}
