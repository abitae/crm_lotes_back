<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_flat_polygons', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->string('title', 100);
            $table->string('description', 500)->nullable();
            $table->json('vertices');
            $table->string('color', 7)->default('#f97316');
            $table->string('hover_color', 7)->default('#fb923c');
            $table->decimal('opacity', 3, 2)->default(0.35);
            $table->timestamps();

            $table->unique(['project_id', 'lot_id'], 'pflat_polygons_project_lot_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_flat_polygons');
    }
};
