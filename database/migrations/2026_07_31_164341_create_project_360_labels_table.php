<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_360_labels', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_360_tour_id')->constrained('project_360_tours')->cascadeOnDelete();
            $table->foreignId('source_panorama_id')->constrained('project_assets')->cascadeOnDelete();
            $table->string('text', 120);
            $table->decimal('yaw', 7, 3);
            $table->decimal('pitch', 6, 3);
            $table->string('color', 7)->default('#ffffff');
            $table->decimal('size', 4, 2)->default(1);
            $table->timestamps();

            $table->index(
                ['project_360_tour_id', 'source_panorama_id'],
                'p360_labels_tour_source_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_360_labels');
    }
};
