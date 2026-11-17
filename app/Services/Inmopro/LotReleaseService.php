<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotHistory;
use App\Models\Inmopro\LotStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Frees a reserved lot (fallen sale / withdrawal), keeping a snapshot of the
 * sale in the lot history and the audit log.
 */
class LotReleaseService
{
    /**
     * @var array<string, string>
     */
    public const REASONS = [
        'VENTA_CAIDA' => 'Venta caída',
        'DESISTIMIENTO' => 'Desistimiento del cliente',
        'OTRO' => 'Otro',
    ];

    /**
     * @var list<string>
     */
    public const RELEASABLE_STATUS_CODES = [
        LotStatus::CODE_RESERVADO,
        LotStatus::CODE_CUOTAS,
    ];

    public function __construct(
        private LotHistoryRecorder $historyRecorder,
        private InmoproAuditLogger $auditLogger,
    ) {}

    public function release(Lot $lot, string $reason, ?string $notes): void
    {
        DB::transaction(function () use ($lot, $reason, $notes): void {
            /** @var Lot $locked */
            $locked = Lot::query()->with(['status', 'advisor'])->lockForUpdate()->findOrFail($lot->id);

            if (! in_array($locked->status?->code, self::RELEASABLE_STATUS_CODES, true)) {
                throw ValidationException::withMessages([
                    'reason' => 'Solo se pueden liberar lotes en estado RESERVADO o CUOTAS.',
                ]);
            }

            $paymentsCount = $locked->payments()->count();

            if ($paymentsCount > 0) {
                throw ValidationException::withMessages([
                    'reason' => sprintf(
                        'El lote tiene %d abono(s) registrado(s). Anule los abonos antes de liberar el lote.',
                        $paymentsCount,
                    ),
                ]);
            }

            $freeStatusId = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->value('id');

            if (! $freeStatusId) {
                throw ValidationException::withMessages(['reason' => 'No existe el estado LIBRE configurado.']);
            }

            $snapshot = [
                'previous_status' => $locked->status?->code,
                'client_id' => $locked->client_id,
                'client_name' => $locked->client_name,
                'client_dni' => $locked->client_dni,
                'advisor_id' => $locked->advisor_id,
                'advisor_name' => $locked->advisor?->name,
                'sale_price' => $this->money($locked->sale_price),
                'advance' => $this->money($locked->advance),
                'remaining_balance' => $this->money($locked->remaining_balance),
                'contract_date' => $locked->contract_date?->toDateString(),
                'contract_number' => $locked->contract_number,
                'operation_number' => $locked->operation_number,
                'payment_limit_date' => $locked->payment_limit_date?->toDateString(),
                'installments_removed' => $locked->installments()->count(),
            ];

            // Installments and plans belong to the fallen sale; payments were checked above.
            $locked->installments()->delete();
            $locked->paymentPlans()->delete();

            $reasonLabel = self::REASONS[$reason] ?? $reason;
            $event = in_array($reason, ['VENTA_CAIDA', 'DESISTIMIENTO'], true)
                ? LotHistory::EVENT_SALE_FALLEN
                : LotHistory::EVENT_RELEASED;

            $this->historyRecorder->withContext([
                'event' => $event,
                'reason' => $reasonLabel,
                'notes' => $notes,
                'meta' => ['sale' => $snapshot],
            ], fn () => $locked->update([
                'lot_status_id' => $freeStatusId,
                'client_id' => null,
                'client_name' => null,
                'client_dni' => null,
                'advisor_id' => null,
                'sale_price' => null,
                'advance' => null,
                'remaining_balance' => null,
                'payment_limit_date' => null,
                'contract_date' => null,
                'contract_number' => null,
                'operation_number' => null,
                'notarial_transfer_date' => null,
            ]));

            $this->auditLogger->recordEvent('lots.released', $locked, [
                'lot_id' => $locked->id,
                'lot' => sprintf('%s-%s', $locked->block, $locked->number),
                'project_id' => $locked->project_id,
                'reason' => $reasonLabel,
                'notes' => $notes,
                'sale' => $snapshot,
            ]);
        });
    }

    private function money(mixed $value): ?string
    {
        return $value === null ? null : number_format((float) $value, 2, '.', '');
    }
}
