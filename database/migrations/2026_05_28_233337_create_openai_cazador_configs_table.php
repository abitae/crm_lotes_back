<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('openai_cazador_configs', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->string('model')->nullable();
            $table->unsignedInteger('max_message_length')->default(2000);
            $table->unsignedSmallInteger('rate_limit')->default(8);
            $table->unsignedSmallInteger('knowledge_rate_limit')->default(60);
            $table->text('openai_api_key')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('openai_cazador_configs');
    }
};
