<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_id')->constrained('lots')->cascadeOnDelete();
            $table->foreignId('lot_transfer_confirmation_id')->nullable()->constrained('lot_transfer_confirmations')->nullOnDelete();
            $table->string('category', 30);
            $table->string('concept');
            $table->decimal('amount', 15, 2);
            $table->date('expense_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['lot_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_expenses');
    }
};
