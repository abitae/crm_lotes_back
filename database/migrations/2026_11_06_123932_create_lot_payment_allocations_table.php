<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('lot_payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_payment_id')->constrained('lot_payments')->cascadeOnDelete();
            $table->foreignId('lot_installment_id')->constrained('lot_installments')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamps();

            $table->unique(['lot_payment_id', 'lot_installment_id']);
        });

        DB::table('lot_payments')
            ->whereNotNull('lot_installment_id')
            ->orderBy('id')
            ->chunkById(500, function ($payments): void {
                DB::table('lot_payment_allocations')->insert(
                    $payments->map(fn ($payment): array => [
                        'lot_payment_id' => $payment->id,
                        'lot_installment_id' => $payment->lot_installment_id,
                        'amount' => $payment->amount,
                        'created_at' => $payment->created_at,
                        'updated_at' => $payment->updated_at,
                    ])->all(),
                );
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_payment_allocations');
    }
};
