<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_id')->constrained('investors')->cascadeOnDelete();
            $table->string('code', 30)->unique();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('currency', 3)->default('PEN');
            $table->decimal('principal_amount', 15, 2);
            $table->date('received_at');
            $table->foreignId('cash_account_id')->nullable()->constrained('cash_accounts')->nullOnDelete();
            $table->decimal('rate_percent', 8, 4);
            $table->string('rate_period', 20);
            $table->string('payment_mode', 30);
            $table->unsignedSmallInteger('term_months');
            $table->unsignedSmallInteger('installments_count');
            $table->string('frequency', 20);
            $table->date('first_due_date');
            $table->decimal('withholding_percent', 5, 2)->default(0);
            $table->decimal('total_interest', 15, 2)->default(0);
            $table->decimal('total_payable', 15, 2)->default(0);
            $table->string('status', 20)->default('BORRADOR');
            $table->string('contract_path')->nullable();
            $table->date('signed_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['investor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_contracts');
    }
};
