<?php

namespace App\Console\Commands;

use App\Services\Inmopro\InvestorContractService;
use App\Services\Inmopro\ReceivableService;
use Illuminate\Console\Command;

class MarkOverdueLotInstallments extends Command
{
    protected $signature = 'receivables:mark-overdue-installments';

    protected $description = 'Marca como VENCIDA las cuotas PENDIENTE de lotes y de inversionistas cuya fecha de vencimiento ya pasó.';

    public function handle(ReceivableService $receivableService, InvestorContractService $investorContractService): int
    {
        $updated = $receivableService->markOverdueInstallments();
        $updatedInvestor = $investorContractService->markOverdueInstallments();

        $this->info(sprintf('Cuotas de lotes marcadas como vencidas: %d', $updated));
        $this->info(sprintf('Cuotas de inversionistas marcadas como vencidas: %d', $updatedInvestor));

        return self::SUCCESS;
    }
}
