<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->foreignId('lot_id')
                ->nullable()
                ->after('source_panorama_id')
                ->constrained('lots')
                ->nullOnDelete();
            $table->unique(
                ['project_360_tour_id', 'lot_id'],
                'p360_polygons_tour_lot_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->dropUnique('p360_polygons_tour_lot_unique');
            $table->dropConstrainedForeignId('lot_id');
        });
    }
};
