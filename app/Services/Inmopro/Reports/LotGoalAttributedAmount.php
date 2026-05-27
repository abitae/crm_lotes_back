<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Lot;

class LotGoalAttributedAmount
{
    public function forLot(Lot $lot): float
    {
        $price = (float) ($lot->price ?? 0);
        $percentage = (int) ($lot->project?->projectType?->percentage_meta ?? 100);

        if ($percentage < 0) {
            $percentage = 0;
        }

        if ($percentage > 100) {
            $percentage = 100;
        }

        return round($price * ($percentage / 100), 2);
    }
}
