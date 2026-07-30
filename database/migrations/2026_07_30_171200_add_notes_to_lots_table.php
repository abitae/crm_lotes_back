<?php

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotTransferConfirmation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('lots') || Schema::hasColumn('lots', 'notes')) {
            return;
        }

        Schema::table('lots', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('observations');
        });

        if (! Schema::hasTable('lot_transfer_confirmations')
            || ! Schema::hasColumn('lot_transfer_confirmations', 'notes')) {
            return;
        }

        LotTransferConfirmation::query()
            ->whereNotNull('notes')
            ->orderByDesc('id')
            ->get(['id', 'lot_id', 'notes'])
            ->unique('lot_id')
            ->each(function (LotTransferConfirmation $transfer): void {
                Lot::query()
                    ->whereKey($transfer->lot_id)
                    ->whereNull('notes')
                    ->update(['notes' => $transfer->notes]);
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('lots') || ! Schema::hasColumn('lots', 'notes')) {
            return;
        }

        Schema::table('lots', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
