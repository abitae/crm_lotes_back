<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lot_installments', function (Blueprint $table) {
            $table->foreignId('lot_payment_plan_id')
                ->nullable()
                ->after('lot_id')
                ->constrained('lot_payment_plans')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_installments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lot_payment_plan_id');
        });
    }
};
