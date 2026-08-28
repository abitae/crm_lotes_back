<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commissions', function (Blueprint $table): void {
            $table->timestamp('paid_at')->nullable()->after('commission_status_id');
            $table->decimal('paid_amount', 15, 2)->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table): void {
            $table->dropColumn(['paid_at', 'paid_amount']);
        });
    }
};
