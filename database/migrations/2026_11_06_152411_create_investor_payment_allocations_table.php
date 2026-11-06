<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_payment_id')->constrained('investor_payments')->cascadeOnDelete();
            $table->foreignId('investor_installment_id')->constrained('investor_installments')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->decimal('interest_amount', 15, 2)->default(0);
            $table->decimal('principal_amount', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['investor_payment_id', 'investor_installment_id'], 'investor_allocations_payment_installment_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_payment_allocations');
    }
};
