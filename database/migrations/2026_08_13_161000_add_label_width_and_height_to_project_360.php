<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_360_labels', function (Blueprint $table): void {
            $table->decimal('width', 4, 2)->default(1.20)->after('size');
            $table->decimal('height', 4, 2)->default(0.34)->after('width');
        });

        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->decimal('label_width', 4, 2)->default(1.20)->after('label_size');
            $table->decimal('label_height', 4, 2)->default(0.34)->after('label_width');
        });
    }

    public function down(): void
    {
        Schema::table('project_360_labels', function (Blueprint $table): void {
            $table->dropColumn(['width', 'height']);
        });

        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->dropColumn(['label_width', 'label_height']);
        });
    }
};
