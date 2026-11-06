<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Reglas compartidas por los cronogramas (lotes e inversionistas): fechas por frecuencia y reparto al céntimo.
 */
final class ScheduleMath
{
    public const FREQUENCY_MONTHLY = 'MENSUAL';

    public const FREQUENCY_BIWEEKLY = 'QUINCENAL';

    public const FREQUENCY_WEEKLY = 'SEMANAL';

    /**
     * @var list<string>
     */
    public const FREQUENCIES = [self::FREQUENCY_MONTHLY, self::FREQUENCY_BIWEEKLY, self::FREQUENCY_WEEKLY];

    /**
     * Fecha de la cuota número $index (0 = primera). Las mensuales no se desbordan a fin de mes.
     */
    public static function dueDate(CarbonImmutable $firstDate, string $frequency, int $index): CarbonImmutable
    {
        return match ($frequency) {
            self::FREQUENCY_BIWEEKLY => $firstDate->addDays(15 * $index),
            self::FREQUENCY_WEEKLY => $firstDate->addWeeks($index),
            default => $firstDate->addMonthsNoOverflow($index),
        };
    }

    /**
     * Reparte un monto en partes iguales truncadas al céntimo; la última absorbe la diferencia.
     *
     * @return list<int> céntimos por parte
     */
    public static function splitCents(int $totalCents, int $parts): array
    {
        $parts = max(1, $parts);
        $baseCents = intdiv($totalCents, $parts);
        $result = array_fill(0, $parts, $baseCents);
        $result[$parts - 1] = $totalCents - ($baseCents * ($parts - 1));

        return $result;
    }

    public static function toCents(float|int|string $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}
