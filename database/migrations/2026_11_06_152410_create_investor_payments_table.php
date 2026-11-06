<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_contract_id')->constrained('investor_contracts')->cascadeOnDelete();
            $table->foreignId('cash_account_id')->constrained('cash_accounts');
            $table->decimal('amount', 15, 2);
            $table->decimal('withholding_amount', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2);
            $table->date('paid_at');
            $table->string('payment_method', 30);
            $table->string('reference', 120)->nullable();
            $table->string('voucher_path');
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['investor_contract_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_payments');
    }
};
