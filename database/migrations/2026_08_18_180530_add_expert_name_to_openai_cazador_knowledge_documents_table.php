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
        Schema::table('openai_cazador_knowledge_documents', function (Blueprint $table) {
            $table->string('expert_name', 120)->default('Conocimiento general')->after('version')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('openai_cazador_knowledge_documents', function (Blueprint $table) {
            $table->dropIndex(['expert_name']);
            $table->dropColumn('expert_name');
        });
    }
};
