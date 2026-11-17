<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CommissionService
{
    private const DECIMAL_SCALE = 2;

    public function __construct(
        private InmoproAuditLogger $auditLogger,
    ) {}

    /**
     * Calculate and create commissions when a lot is transferred.
     * Uses the advisor's level direct_rate and pyramid_rate.
     * Idempotent: does nothing if the lot already has commissions.
     * The commission date is the transfer date (fecha de escritura), so it is
     * listed in /inmopro/commissions under the period the sale was closed.
     */
    public function createCommissionsForTransferredLot(Lot $lot): void
    {
        $lot->load(['advisor.level', 'advisor.superior']);

        if (! $lot->advisor_id || ! $lot->advisor || ! $lot->advisor->level) {
            return;
        }

        if ($lot->commissions()->exists()) {
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
        $date = $this->commissionDateFor($lot);

        Commission::create([
            'lot_id' => $lot->id,
            'advisor_id' => $advisor->id,
            'amount' => $this->percentageOf($price, $directRate),
            'percentage' => $directRate,
            'type' => 'DIRECTA',
            'commission_status_id' => $pendingStatus->id,
            'date' => $date,
        ]);

        if ($advisor->superior_id && $advisor->superior) {
            Commission::create([
                'lot_id' => $lot->id,
                'advisor_id' => $advisor->superior->id,
                'amount' => $this->percentageOf($price, $pyramidRate),
                'percentage' => $pyramidRate,
                'type' => 'PIRAMIDAL',
                'commission_status_id' => $pendingStatus->id,
                'date' => $date,
            ]);
        }
    }

    /**
     * Remove the still-unpaid commissions of a lot (e.g. when its transfer is
     * rejected and the lot goes back to RESERVADO). Paid ones are kept.
     */
    public function deletePendingCommissionsForLot(Lot $lot): void
    {
        $lot->commissions()
            ->whereHas('status', fn ($query) => $query->where('code', 'PENDIENTE'))
            ->delete();
    }

    private function commissionDateFor(Lot $lot): string
    {
        return $lot->notarial_transfer_date?->toDateString()
            ?? $lot->contract_date?->toDateString()
            ?? now()->toDateString();
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

        if (! $paidStatus) {
            return;
        }

        DB::transaction(function () use ($commission, $paidStatus): void {
            /** @var Commission $locked */
            $locked = Commission::query()
                ->with(['status', 'advisor', 'lot.project'])
                ->lockForUpdate()
                ->findOrFail($commission->id);

            // Paying twice would overwrite paid_at/paid_amount and break the audit trail.
            if ((int) $locked->commission_status_id === (int) $paidStatus->id) {
                throw ValidationException::withMessages([
                    'commission' => 'La comisión ya fue pagada.',
                ]);
            }

            $previousStatus = $locked->status?->code;

            $locked->update([
                'commission_status_id' => $paidStatus->id,
                'paid_at' => now(),
                'paid_amount' => $locked->amount,
            ]);

            $this->auditLogger->recordEvent('commissions.paid', $locked, [
                'commission_id' => $locked->id,
                'type' => $locked->type,
                'advisor_id' => $locked->advisor_id,
                'advisor_name' => $locked->advisor?->name,
                'lot_id' => $locked->lot_id,
                'lot' => $locked->lot ? sprintf('%s-%s', $locked->lot->block, $locked->lot->number) : null,
                'project' => $locked->lot?->project?->name,
                'percentage' => (string) $locked->percentage,
                'amount' => (string) $locked->amount,
                'paid_amount' => (string) $locked->paid_amount,
                'paid_at' => $locked->paid_at?->toDateTimeString(),
                'status_before' => $previousStatus,
                'status_after' => $paidStatus->code,
            ]);
        });

        $commission->refresh();
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
