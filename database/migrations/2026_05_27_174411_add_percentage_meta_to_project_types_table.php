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
        Schema::table('project_types', function (Blueprint $table) {
            $table->unsignedTinyInteger('percentage_meta')->default(100)->after('sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_types', function (Blueprint $table) {
            $table->dropColumn('percentage_meta');
        });
    }
};
