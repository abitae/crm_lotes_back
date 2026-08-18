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
        Schema::create('openai_cazador_knowledge_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('version')->unique();
            $table->string('original_name');
            $table->string('storage_path');
            $table->unsignedBigInteger('file_size');
            $table->string('sha256', 64);
            $table->string('status', 20)->default('processing')->index();
            $table->boolean('is_active')->default(false)->index();
            $table->text('error_message')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('indexed_at')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('openai_cazador_knowledge_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('openai_cazador_knowledge_documents')->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->string('heading')->nullable();
            $table->longText('content');
            $table->longText('embedding');
            $table->timestamps();
            $table->unique(['document_id', 'position']);
        });

        Schema::create('openai_cazador_conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('advisor_id')->constrained('advisors')->cascadeOnDelete();
            $table->timestamp('last_active_at')->index();
            $table->timestamps();
        });

        Schema::create('openai_cazador_conversation_messages', function (Blueprint $table) {
            $table->id();
            $table->uuid('conversation_id');
            $table->string('role', 20);
            $table->text('content');
            $table->timestamps();
            $table->foreign('conversation_id')->references('id')->on('openai_cazador_conversations')->cascadeOnDelete();
            $table->index(['conversation_id', 'created_at'], 'cazador_conversation_messages_history_idx');
        });

        Schema::create('openai_cazador_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advisor_id')->nullable()->constrained('advisors')->nullOnDelete();
            $table->uuid('conversation_id')->nullable()->index();
            $table->uuid('invocation_id')->nullable()->index();
            $table->string('status', 20)->index();
            $table->string('model')->default('gpt-5.4');
            $table->unsignedInteger('duration_ms')->default(0);
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('cache_read_tokens')->default(0);
            $table->unsignedInteger('reasoning_tokens')->default(0);
            $table->unsignedSmallInteger('tool_calls_count')->default(0);
            $table->unsignedInteger('knowledge_version')->nullable();
            $table->string('error_code')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('openai_cazador_runs');
        Schema::dropIfExists('openai_cazador_conversation_messages');
        Schema::dropIfExists('openai_cazador_conversations');
        Schema::dropIfExists('openai_cazador_knowledge_chunks');
        Schema::dropIfExists('openai_cazador_knowledge_documents');
    }
};
