<?php

namespace App\Console\Commands;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('inmopro:sync-transferred-lot-balances')]
#[Description('Actualiza saldos de lotes transferidos para dejarlos cobrados al 100%.')]
class SyncTransferredLotBalancesCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $transferredStatusId = LotStatus::query()
            ->where('code', LotStatus::CODE_TRANSFERIDO)
            ->value('id');

        if (! $transferredStatusId) {
            $this->error('No existe el estado TRANSFERIDO configurado.');

            return self::FAILURE;
        }

        $updated = 0;

        Lot::query()
            ->where('lot_status_id', $transferredStatusId)
            ->where(function ($query) {
                $query
                    ->whereColumn('advance', '!=', 'price')
                    ->orWhereNull('advance')
                    ->orWhere('remaining_balance', '!=', 0)
                    ->orWhereNull('remaining_balance');
            })
            ->chunkById(100, function ($lots) use (&$updated) {
                foreach ($lots as $lot) {
                    $lot->update([
                        'advance' => $lot->price,
                        'remaining_balance' => 0,
                    ]);

                    $updated++;
                }
            });

        $this->info("Lotes transferidos actualizados: {$updated}");

        return self::SUCCESS;
    }
}
