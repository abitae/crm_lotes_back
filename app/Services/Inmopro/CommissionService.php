<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;

class CommissionService
{
    private const DECIMAL_SCALE = 2;

    /**
     * Calculate and create commissions when a lot is transferred.
     * Uses the advisor's level direct_rate and pyramid_rate.
     */
    public function createCommissionsForTransferredLot(Lot $lot): void
    {
        $lot->load(['advisor.level', 'advisor.superior']);

        if (! $lot->advisor_id || ! $lot->advisor) {
            return;
        }

        $advisor = $lot->advisor;
        $pendingStatus = CommissionStatus::where('code', 'PENDIENTE')->first();

        if (! $pendingStatus) {
            return;
        }

        $directRate = (string) $advisor->level->direct_rate;
        $pyramidRate = (string) $advisor->level->pyramid_rate;
        $price = (string) ($lot->sale_price ?? $lot->price);

        Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => $advisor->id,
            'amount' => $this->percentageOf($price, $directRate),
            'percentage' => $directRate,
            'type' => 'DIRECTA',
            'commission_status_id' => $pendingStatus->id,
            'date' => $lot->contract_date ?? now()->toDateString(),
        ]);

        if ($advisor->superior_id && $advisor->superior) {
            Commission::create([
                'lot_id' => $lot->id,
                'advisor_id' => $advisor->superior->id,
                'amount' => $this->percentageOf($price, $pyramidRate),
                'percentage' => $pyramidRate,
                'type' => 'PIRAMIDAL',
                'commission_status_id' => $pendingStatus->id,
                'date' => $lot->contract_date ?? now()->toDateString(),
            ]);
        }
    }

    /**
     * Re-derive each commission's amount from the lot's current price and the
     * commission's own percentage. This intentionally also updates commissions
     * already marked PAGADO (existing, tested business rule: correcting a
     * lot's sale price recalculates every commission tied to it). The
     * historical `paid_amount` captured by markAsPaid() is what actually
     * disbursed and is never touched here — only the live `amount` moves.
     */
    public function recalculateForLot(Lot $lot): void
    {
        $price = (string) ($lot->sale_price ?? $lot->price);

        $lot->commissions()->get()->each(function (Commission $commission) use ($price): void {
            $commission->update([
                'amount' => $this->percentageOf($price, (string) $commission->percentage),
            ]);
        });
    }

    /**
     * Mark a commission as paid, recording when and how much was actually paid.
     */
    public function markAsPaid(Commission $commission): void
    {
        $paidStatus = CommissionStatus::where('code', 'PAGADO')->first();

        if ($paidStatus) {
            $commission->update([
                'commission_status_id' => $paidStatus->id,
                'paid_at' => now(),
                'paid_amount' => $commission->amount,
            ]);
        }
    }

    /**
     * amount = base * percentage / 100, computed with bcmath so the result
     * matches the `decimal:2` columns exactly instead of drifting through
     * PHP float arithmetic, then rounded half-up to 2 decimal places.
     */
    private function percentageOf(string $base, string $percentage): string
    {
        $product = bcmul($base, $percentage, self::DECIMAL_SCALE + 4);
        $divided = bcdiv($product, '100', self::DECIMAL_SCALE + 4);

        return $this->roundHalfUp($divided, self::DECIMAL_SCALE);
    }

    private function roundHalfUp(string $number, int $scale): string
    {
        $epsilon = '0.'.str_repeat('0', $scale).'5';

        return str_starts_with($number, '-')
            ? bcsub($number, $epsilon, $scale)
            : bcadd($number, $epsilon, $scale);
    }
}
