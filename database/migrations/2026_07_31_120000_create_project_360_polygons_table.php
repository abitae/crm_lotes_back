<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_360_polygons', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_360_tour_id')->constrained('project_360_tours')->cascadeOnDelete();
            $table->foreignId('source_panorama_id')->constrained('project_assets')->cascadeOnDelete();
            $table->string('title', 100);
            $table->string('description', 500)->nullable();
            $table->json('vertices');
            $table->string('color', 7)->default('#f97316');
            $table->string('hover_color', 7)->default('#fb923c');
            $table->decimal('opacity', 3, 2)->default(0.28);
            $table->timestamps();

            $table->index(
                ['project_360_tour_id', 'source_panorama_id'],
                'p360_polygons_tour_source_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_360_polygons');
    }
};
