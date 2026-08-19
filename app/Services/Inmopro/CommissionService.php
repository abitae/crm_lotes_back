<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;

class CommissionService
{
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

        $directRate = (float) $advisor->level->direct_rate;
        $pyramidRate = (float) $advisor->level->pyramid_rate;
        $price = (float) ($lot->sale_price ?? $lot->price);

        Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => $advisor->id,
            'amount' => $price * ($directRate / 100),
            'percentage' => $directRate,
            'type' => 'DIRECTA',
            'commission_status_id' => $pendingStatus->id,
            'date' => $lot->contract_date ?? now()->toDateString(),
        ]);

        if ($advisor->superior_id && $advisor->superior) {
            Commission::create([
                'lot_id' => $lot->id,
                'advisor_id' => $advisor->superior->id,
                'amount' => $price * ($pyramidRate / 100),
                'percentage' => $pyramidRate,
                'type' => 'PIRAMIDAL',
                'commission_status_id' => $pendingStatus->id,
                'date' => $lot->contract_date ?? now()->toDateString(),
            ]);
        }
    }

    public function recalculateForLot(Lot $lot): void
    {
        $price = (float) ($lot->sale_price ?? $lot->price);

        $lot->commissions()->get()->each(function (Commission $commission) use ($price): void {
            $commission->update([
                'amount' => round($price * ((float) $commission->percentage / 100), 2),
            ]);
        });
    }

    /**
     * Mark a commission as paid.
     */
    public function markAsPaid(Commission $commission): void
    {
        $paidStatus = CommissionStatus::where('code', 'PAGADO')->first();

        if ($paidStatus) {
            $commission->update(['commission_status_id' => $paidStatus->id]);
        }
    }
}
