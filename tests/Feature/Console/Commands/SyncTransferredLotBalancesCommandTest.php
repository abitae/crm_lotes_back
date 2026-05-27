<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncTransferredLotBalancesCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_updates_only_transferred_lot_balances(): void
    {
        $transferredStatus = LotStatus::create([
            'name' => 'Transferido',
            'code' => LotStatus::CODE_TRANSFERIDO,
            'color' => '#64748b',
            'sort_order' => 4,
        ]);
        $reservedStatus = LotStatus::create([
            'name' => 'Reservado',
            'code' => LotStatus::CODE_RESERVADO,
            'color' => '#f97316',
            'sort_order' => 3,
        ]);
        $project = Project::create([
            'name' => 'Proyecto Test',
            'location' => 'Huancayo',
            'total_lots' => 2,
            'blocks' => ['A'],
        ]);

        $transferredLot = Lot::create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => 1,
            'area' => 120,
            'price' => 50000,
            'lot_status_id' => $transferredStatus->id,
            'advance' => 10000,
            'remaining_balance' => 40000,
        ]);
        $reservedLot = Lot::create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => 2,
            'area' => 100,
            'price' => 30000,
            'lot_status_id' => $reservedStatus->id,
            'advance' => 5000,
            'remaining_balance' => 25000,
        ]);

        $this->artisan('inmopro:sync-transferred-lot-balances')
            ->expectsOutput('Lotes transferidos actualizados: 1')
            ->assertSuccessful();

        $transferredLot->refresh();
        $reservedLot->refresh();

        $this->assertSame('50000.00', (string) $transferredLot->advance);
        $this->assertSame('0.00', (string) $transferredLot->remaining_balance);
        $this->assertSame('5000.00', (string) $reservedLot->advance);
        $this->assertSame('25000.00', (string) $reservedLot->remaining_balance);
    }

    public function test_command_fails_when_transferred_status_does_not_exist(): void
    {
        $this->artisan('inmopro:sync-transferred-lot-balances')
            ->expectsOutput('No existe el estado TRANSFERIDO configurado.')
            ->assertFailed();
    }

    public function test_command_is_idempotent_for_already_synced_lots(): void
    {
        $transferredStatus = LotStatus::create([
            'name' => 'Transferido',
            'code' => LotStatus::CODE_TRANSFERIDO,
            'color' => '#64748b',
            'sort_order' => 4,
        ]);
        $project = Project::create([
            'name' => 'Proyecto Test',
            'location' => 'Huancayo',
            'total_lots' => 1,
            'blocks' => ['A'],
        ]);

        Lot::create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => 1,
            'area' => 120,
            'price' => 50000,
            'lot_status_id' => $transferredStatus->id,
            'advance' => 50000,
            'remaining_balance' => 0,
        ]);

        $this->artisan('inmopro:sync-transferred-lot-balances')
            ->expectsOutput('Lotes transferidos actualizados: 0')
            ->assertSuccessful();
    }
}
