<?php

namespace App\Console\Commands;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('inmopro:approve-transferred-lot-reviews {--dry-run : Simula la actualización sin guardar cambios}')]
#[Description('Aprueba la revisión de lotes transferidos pendientes o sin revisión y completa la fecha de transferencia vacía.')]
class ApproveTransferredLotReviewsCommand extends Command
{
    private const LEGACY_EVIDENCE_PATH = 'legacy/sin-evidencia';

    private const REVIEW_NOTE = 'OK';

    public function handle(): int
    {
        $transferredStatusId = LotStatus::query()
            ->where('code', LotStatus::CODE_TRANSFERIDO)
            ->value('id');

        if (! $transferredStatusId) {
            $this->error('No existe el estado TRANSFERIDO configurado.');

            return self::FAILURE;
        }

        $needsReviewer = Lot::query()
            ->where('lot_status_id', $transferredStatusId)
            ->whereDoesntHave('transferConfirmations')
            ->exists();

        $reviewerId = User::query()->orderBy('id')->value('id');

        if ($needsReviewer && ! $reviewerId) {
            $this->error('No hay usuarios para registrar la revisión aprobada.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;

        Lot::query()
            ->where('lot_status_id', $transferredStatusId)
            ->with('latestTransferConfirmation')
            ->chunkById(100, function ($lots) use (&$updated, $dryRun, $reviewerId): void {
                foreach ($lots as $lot) {
                    $confirmation = $lot->latestTransferConfirmation;

                    if (! $this->needsApproval($confirmation)) {
                        continue;
                    }

                    $transferDate = $lot->notarial_transfer_date?->toDateString()
                        ?? $lot->updated_at?->toDateString();

                    if (! $dryRun) {
                        DB::transaction(function () use ($lot, $confirmation, $reviewerId, $transferDate): void {
                            if ($confirmation) {
                                $confirmation->update([
                                    'status' => LotTransferConfirmation::STATUS_APPROVED,
                                    'review_notes' => self::REVIEW_NOTE,
                                    'reviewed_at' => $confirmation->reviewed_at ?? now(),
                                ]);
                            } else {
                                LotTransferConfirmation::create([
                                    'lot_id' => $lot->id,
                                    'status' => LotTransferConfirmation::STATUS_APPROVED,
                                    'evidence_path' => self::LEGACY_EVIDENCE_PATH,
                                    'requested_by' => $reviewerId,
                                    'reviewed_by' => $reviewerId,
                                    'reviewed_at' => now(),
                                    'review_notes' => self::REVIEW_NOTE,
                                ]);
                            }

                            if ($lot->notarial_transfer_date === null && $transferDate) {
                                $lot->update([
                                    'notarial_transfer_date' => $transferDate,
                                ]);
                            }
                        });
                    }

                    $updated++;
                }
            });

        $this->info($dryRun
            ? "Lotes que se actualizarían: {$updated}"
            : "Lotes actualizados: {$updated}");

        return self::SUCCESS;
    }

    private function needsApproval(?LotTransferConfirmation $confirmation): bool
    {
        if ($confirmation === null) {
            return true;
        }

        $status = trim((string) $confirmation->status);

        return $status === '' || $status === LotTransferConfirmation::STATUS_PENDING;
    }
}
