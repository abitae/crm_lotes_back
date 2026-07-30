<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('lot_transfer_confirmations')
            || Schema::hasColumn('lot_transfer_confirmations', 'notes')) {
            return;
        }

        Schema::table('lot_transfer_confirmations', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('review_notes');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('lot_transfer_confirmations')
            || ! Schema::hasColumn('lot_transfer_confirmations', 'notes')) {
            return;
        }

        Schema::table('lot_transfer_confirmations', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
