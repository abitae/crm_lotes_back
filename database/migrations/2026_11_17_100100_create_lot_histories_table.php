<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lot_id')->constrained('lots')->cascadeOnDelete();
            $table->string('event', 40)->index();
            $table->foreignId('from_status_id')->nullable()->constrained('lot_statuses')->nullOnDelete();
            $table->foreignId('to_status_id')->nullable()->constrained('lot_statuses')->nullOnDelete();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('client_name')->nullable();
            $table->string('client_dni', 20)->nullable();
            $table->unsignedBigInteger('advisor_id')->nullable();
            $table->string('advisor_name')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('reason')->nullable();
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['lot_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_histories');
    }
};
