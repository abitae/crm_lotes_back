<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Lot;
use Illuminate\Support\Carbon;

class LotDetailSerializer
{
    /**
     * @return array<string, mixed>
     */
    public function toRow(Lot $lot): array
    {
        $paymentLimit = $lot->payment_limit_date;
        $daysOverdue = null;

        if ($paymentLimit && $lot->status?->code === 'RESERVADO') {
            $daysOverdue = Carbon::parse($paymentLimit)->startOfDay()->diffInDays(now()->startOfDay(), false);
            if ($daysOverdue < 0) {
                $daysOverdue = null;
            }
        }

        return [
            'id' => $lot->id,
            'client_phone' => $lot->client?->phone,
            'client_name' => $lot->client?->name ?? $lot->client_name,
            'operation_number' => $lot->operation_number,
            'advance' => round((float) ($lot->advance ?? 0), 2),
            'price' => round((float) ($lot->price ?? 0), 2),
            'project_name' => $lot->project?->name,
            'block' => $lot->block,
            'number' => $lot->number,
            'status_name' => $lot->status?->name,
            'status_code' => $lot->status?->code,
            'advisor_name' => $lot->advisor?->name,
            'team_name' => $lot->advisor?->team?->name,
            'contract_date' => $lot->contract_date?->format('Y-m-d'),
            'payment_limit_date' => $paymentLimit?->format('Y-m-d'),
            'days_overdue' => $daysOverdue,
        ];
    }
}
