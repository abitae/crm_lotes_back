<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_entries', function (Blueprint $table) {
            $table->foreignId('investor_contract_id')->nullable()->after('lot_payment_id')->constrained('investor_contracts')->nullOnDelete();
            $table->foreignId('investor_payment_id')->nullable()->after('investor_contract_id')->constrained('investor_payments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cash_entries', function (Blueprint $table) {
            $table->dropForeign(['investor_payment_id']);
            $table->dropForeign(['investor_contract_id']);
            $table->dropColumn(['investor_payment_id', 'investor_contract_id']);
        });
    }
};
