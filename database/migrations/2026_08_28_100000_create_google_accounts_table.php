<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('google_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('google_sub')->unique();
            $table->string('email');
            $table->string('name')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('scopes')->nullable();
            $table->foreignId('advisor_id')->nullable()->unique()->constrained('advisors')->cascadeOnDelete();
            $table->foreignId('datero_id')->nullable()->unique()->constrained('dateros')->cascadeOnDelete();
            $table->string('calendar_id')->default('primary');
            $table->text('calendar_sync_token')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_accounts');
    }
};
