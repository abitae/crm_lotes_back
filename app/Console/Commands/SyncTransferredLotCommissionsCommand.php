<?php

namespace App\Console\Commands;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Services\Inmopro\CommissionService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('inmopro:sync-transferred-lot-commissions {--dry-run : Simula la generación sin guardar cambios}')]
#[Description('Genera las comisiones faltantes de los lotes transferidos que tienen asesor y aún no tienen comisiones.')]
class SyncTransferredLotCommissionsCommand extends Command
{
    public function handle(CommissionService $commissionService): int
    {
        $transferredStatusId = LotStatus::query()
            ->where('code', LotStatus::CODE_TRANSFERIDO)
            ->value('id');

        if (! $transferredStatusId) {
            $this->error('No existe el estado TRANSFERIDO configurado.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $processed = 0;

        Lot::query()
            ->where('lot_status_id', $transferredStatusId)
            ->whereNotNull('advisor_id')
            ->whereDoesntHave('commissions')
            ->chunkById(100, function ($lots) use (&$processed, $dryRun, $commissionService): void {
                foreach ($lots as $lot) {
                    if (! $dryRun) {
                        $commissionService->createCommissionsForTransferredLot($lot);
                    }

                    $processed++;
                }
            });

        $this->info($dryRun
            ? "Lotes transferidos que recibirían comisiones: {$processed}"
            : "Lotes transferidos con comisiones generadas: {$processed}");

        return self::SUCCESS;
    }
}
