<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApproveTransferredLotReviewsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_approves_pending_and_missing_reviews_and_fills_empty_transfer_dates(): void
    {
        $user = User::factory()->create();
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
            'total_lots' => 4,
            'blocks' => ['A'],
        ]);

        $pendingLot = $this->makeLot($project, $transferredStatus, '1', 10000, 40000);
        $this->stampUpdatedAt($pendingLot, '2026-03-15 08:30:00');
        $pendingConfirmation = LotTransferConfirmation::create([
            'lot_id' => $pendingLot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/pending.png',
            'requested_by' => $user->id,
        ]);

        $missingReviewLot = $this->makeLot($project, $transferredStatus, '2', 20000, 10000);
        $this->stampUpdatedAt($missingReviewLot, '2026-04-02 12:00:00');

        $datedLot = $this->makeLot($project, $transferredStatus, '3', 50000, 0);
        $datedLot->update(['notarial_transfer_date' => '2026-01-20']);
        $this->stampUpdatedAt($datedLot, '2026-05-01 09:00:00');
        LotTransferConfirmation::create([
            'lot_id' => $datedLot->id,
            'status' => LotTransferConfirmation::STATUS_PENDING,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/dated.png',
            'requested_by' => $user->id,
        ]);

        $rejectedLot = $this->makeLot($project, $transferredStatus, '4', 15000, 5000);
        $rejectedConfirmation = LotTransferConfirmation::create([
            'lot_id' => $rejectedLot->id,
            'status' => LotTransferConfirmation::STATUS_REJECTED,
            'evidence_path' => 'inmopro/lot-transfer-confirmations/rejected.png',
            'requested_by' => $user->id,
            'rejection_reason' => 'Observado',
        ]);

        $reservedLot = $this->makeLot($project, $reservedStatus, '5', 5000, 25000);

        $this->artisan('inmopro:approve-transferred-lot-reviews', ['--dry-run' => true])
            ->expectsOutput('Lotes que se actualizarían: 3')
            ->assertSuccessful();

        $this->assertSame(
            LotTransferConfirmation::STATUS_PENDING,
            $pendingConfirmation->fresh()->status,
        );
        $this->assertNull($missingReviewLot->fresh()->latestTransferConfirmation);

        $this->artisan('inmopro:approve-transferred-lot-reviews')
            ->expectsOutput('Lotes actualizados: 3')
            ->assertSuccessful();

        $pendingLot->refresh();
        $pendingConfirmation->refresh();
        $missingReviewLot->refresh();
        $datedLot->refresh();
        $rejectedLot->refresh();
        $rejectedConfirmation->refresh();
        $reservedLot->refresh();

        $this->assertSame(LotTransferConfirmation::STATUS_APPROVED, $pendingConfirmation->status);
        $this->assertSame('OK', $pendingConfirmation->review_notes);
        $this->assertNotNull($pendingConfirmation->reviewed_at);
        $this->assertSame('2026-03-15', $pendingLot->notarial_transfer_date?->toDateString());
        $this->assertSame('10000.00', (string) $pendingLot->advance);
        $this->assertSame('40000.00', (string) $pendingLot->remaining_balance);

        $createdConfirmation = $missingReviewLot->latestTransferConfirmation;
        $this->assertNotNull($createdConfirmation);
        $this->assertSame(LotTransferConfirmation::STATUS_APPROVED, $createdConfirmation->status);
        $this->assertSame('OK', $createdConfirmation->review_notes);
        $this->assertSame('legacy/sin-evidencia', $createdConfirmation->evidence_path);
        $this->assertSame($user->id, $createdConfirmation->requested_by);
        $this->assertSame($user->id, $createdConfirmation->reviewed_by);
        $this->assertSame('2026-04-02', $missingReviewLot->notarial_transfer_date?->toDateString());

        $this->assertSame(LotTransferConfirmation::STATUS_APPROVED, $datedLot->latestTransferConfirmation?->status);
        $this->assertSame('OK', $datedLot->latestTransferConfirmation?->review_notes);
        $this->assertSame('2026-01-20', $datedLot->notarial_transfer_date?->toDateString());

        $this->assertSame(LotTransferConfirmation::STATUS_REJECTED, $rejectedConfirmation->status);
        $this->assertNull($rejectedLot->notarial_transfer_date);
        $this->assertNull($reservedLot->latestTransferConfirmation);
        $this->assertSame($reservedStatus->id, $reservedLot->lot_status_id);

        $this->artisan('inmopro:approve-transferred-lot-reviews')
            ->expectsOutput('Lotes actualizados: 0')
            ->assertSuccessful();
    }

    public function test_command_fails_when_transferred_status_does_not_exist(): void
    {
        $this->artisan('inmopro:approve-transferred-lot-reviews')
            ->expectsOutput('No existe el estado TRANSFERIDO configurado.')
            ->assertFailed();
    }

    private function makeLot(Project $project, LotStatus $status, string $number, int $advance, int $remaining): Lot
    {
        return Lot::create([
            'project_id' => $project->id,
            'block' => 'A',
            'number' => $number,
            'area' => 120,
            'price' => 50000,
            'lot_status_id' => $status->id,
            'advance' => $advance,
            'remaining_balance' => $remaining,
        ]);
    }

    private function stampUpdatedAt(Lot $lot, string $updatedAt): void
    {
        Lot::query()->whereKey($lot->id)->update([
            'updated_at' => $updatedAt,
            'notarial_transfer_date' => $lot->notarial_transfer_date,
        ]);
    }
}
