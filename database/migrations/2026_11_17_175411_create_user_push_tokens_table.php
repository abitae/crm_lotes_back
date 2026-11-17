<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('expo_push_token')->unique();
            $table->string('platform', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_push_tokens');
    }
};
