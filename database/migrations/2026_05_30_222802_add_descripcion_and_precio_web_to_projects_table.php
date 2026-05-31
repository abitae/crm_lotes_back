<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->text('descripcion')->nullable()->after('registry_status');
            $table->decimal('precio_web', 15, 2)->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['descripcion', 'precio_web']);
        });
    }
};
