<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * Estados de cuota compartidos por cuotas de lote y de membresía.
 */
final class InstallmentStatus
{
    public const PENDIENTE = 'PENDIENTE';

    public const PARCIAL = 'PARCIAL';

    public const PAGADA = 'PAGADA';

    public const VENCIDA = 'VENCIDA';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [self::PENDIENTE, self::PARCIAL, self::VENCIDA, self::PAGADA];
    }

    /**
     * Una cuota vence al día siguiente de su fecha de vencimiento.
     */
    public static function resolve(float $amount, float $paidAmount, ?CarbonInterface $dueDate): string
    {
        if ($paidAmount >= $amount) {
            return self::PAGADA;
        }

        if ($paidAmount > 0) {
            return self::PARCIAL;
        }

        if ($dueDate !== null && $dueDate->copy()->startOfDay()->lt(today())) {
            return self::VENCIDA;
        }

        return self::PENDIENTE;
    }
}
