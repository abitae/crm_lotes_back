<?php

namespace App\Console\Commands;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireStalePreReservations extends Command
{
    protected $signature = 'pre-reservations:expire-stale';

    protected $description = 'Expira las pre-reservas PENDIENTE cuyo plazo venció y libera el lote asociado.';

    public function handle(): int
    {
        $expiredIds = LotPreReservation::query()
            ->where('status', 'PENDIENTE')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->pluck('id');

        $expiredCount = 0;

        foreach ($expiredIds as $id) {
            $expired = DB::transaction(function () use ($id): bool {
                $preReservation = LotPreReservation::query()->whereKey($id)->lockForUpdate()->first();

                if (! $preReservation || $preReservation->status !== 'PENDIENTE') {
                    return false;
                }

                $lockedLot = Lot::query()->whereKey($preReservation->lot_id)->lockForUpdate()->first();
                $lockedLot?->loadMissing('status');

                $preReservation->update([
                    'status' => 'EXPIRADA',
                    'reviewed_at' => now(),
                    'rejection_reason' => sprintf(
                        'Expiración automática: sin revisión dentro del plazo de %d horas.',
                        LotPreReservation::EXPIRATION_HOURS,
                    ),
                ]);

                if ($lockedLot !== null
                    && $lockedLot->status?->code === 'PRERESERVA'
                    && $lockedLot->client_id === $preReservation->client_id
                ) {
                    $freeStatusId = LotStatus::query()->where('code', 'LIBRE')->value('id');

                    $lockedLot->update([
                        'lot_status_id' => $freeStatusId,
                        'client_id' => null,
                        'client_name' => null,
                        'client_dni' => null,
                        'advisor_id' => null,
                    ]);
                }

                return true;
            });

            if ($expired) {
                $expiredCount++;
            }
        }

        $this->info("Pre-reservas expiradas: {$expiredCount}");

        return self::SUCCESS;
    }
}
