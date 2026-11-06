<?php

namespace App\Console\Commands;

use App\Services\Inmopro\ReceivableService;
use Illuminate\Console\Command;

class MarkOverdueLotInstallments extends Command
{
    protected $signature = 'receivables:mark-overdue-installments';

    protected $description = 'Marca como VENCIDA las cuotas de lote PENDIENTE cuya fecha de vencimiento ya pasó.';

    public function handle(ReceivableService $receivableService): int
    {
        $updated = $receivableService->markOverdueInstallments();

        $this->info(sprintf('Cuotas marcadas como vencidas: %d', $updated));

        return self::SUCCESS;
    }
}
