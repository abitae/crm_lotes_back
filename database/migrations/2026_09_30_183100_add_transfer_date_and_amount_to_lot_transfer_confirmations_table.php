<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('lot_transfer_confirmations')) {
            return;
        }

        Schema::table('lot_transfer_confirmations', function (Blueprint $table) {
            if (! Schema::hasColumn('lot_transfer_confirmations', 'transfer_date')) {
                $table->date('transfer_date')->nullable()->after('evidence_path');
            }

            if (! Schema::hasColumn('lot_transfer_confirmations', 'transfer_amount')) {
                $table->decimal('transfer_amount', 12, 2)->nullable()->after('transfer_date');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('lot_transfer_confirmations')) {
            return;
        }

        Schema::table('lot_transfer_confirmations', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['transfer_date', 'transfer_amount'],
                fn (string $column): bool => Schema::hasColumn('lot_transfer_confirmations', $column),
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
