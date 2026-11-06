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
        Schema::create('lot_payment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_id')->constrained('lots')->cascadeOnDelete();
            $table->decimal('financed_amount', 15, 2);
            $table->unsignedSmallInteger('installments_count');
            $table->string('frequency', 20);
            $table->date('first_due_date');
            $table->string('status', 20)->default('ACTIVO');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('replaced_at')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['lot_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_payment_plans');
    }
};
