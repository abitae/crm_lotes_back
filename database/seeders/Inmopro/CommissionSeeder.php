<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Services\Inmopro\CommissionService;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Transfiere unos cuantos lotes LIBRE al asesor `asesor1` y genera sus comisiones
 * (algunas marcadas como PAGADAS) reutilizando CommissionService, para poder
 * probar /inmopro/commissions y /crm/commissions con datos reales.
 *
 * Idempotente: si el asesor ya tiene comisiones, no vuelve a crear nada.
 */
class CommissionSeeder extends Seeder
{
    private const LOTS_TO_TRANSFER = 6;

    private const PAID_COUNT = 3;

    public function run(CommissionService $commissionService): void
    {
        $advisor = Advisor::query()->where('username', 'asesor1')->first()
            ?? Advisor::query()->orderBy('id')->first();

        if ($advisor === null) {
            throw new RuntimeException('CommissionSeeder: no hay asesores. Ejecute antes AdvisorSeeder.');
        }

        if (Commission::query()->where('advisor_id', $advisor->id)->exists()) {
            return;
        }

        $transferidoId = LotStatus::query()->where('code', 'TRANSFERIDO')->value('id');

        if ($transferidoId === null) {
            throw new RuntimeException('CommissionSeeder: falta el estado de lote TRANSFERIDO. Ejecute LotStatusSeeder.');
        }

        $lots = Lot::query()
            ->whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))
            ->orderBy('id')
            ->limit(self::LOTS_TO_TRANSFER)
            ->get();

        foreach ($lots as $index => $lot) {
            $lot->update([
                'advisor_id' => $advisor->id,
                'lot_status_id' => $transferidoId,
                'sale_price' => $lot->price,
                'client_name' => $advisor->name.' (seed)',
                'contract_date' => now()->subDays(30 - ($index * 5)),
            ]);

            $commissionService->createCommissionsForTransferredLot($lot->fresh());
        }

        $advisor->commissions()
            ->orderBy('id')
            ->limit(self::PAID_COUNT)
            ->get()
            ->each(fn (Commission $commission) => $commissionService->markAsPaid($commission));
    }
}
