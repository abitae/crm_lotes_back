<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_360_tours', function (Blueprint $table): void {
            $table->string('accent_color', 7)->default('#f97316');
            $table->string('hotspot_color', 7)->default('#f97316');
            $table->string('hotspot_hover_color', 7)->default('#fb923c');
            $table->string('hotspot_text_color', 7)->default('#ffffff');
            $table->decimal('hotspot_size', 4, 2)->default(0.16);
            $table->string('hotspot_shape', 20)->default('sphere');
            $table->string('hotspot_label_visibility', 20)->default('always');
            $table->boolean('hotspot_pulse_enabled')->default(true);
        });

        Schema::table('project_360_hotspots', function (Blueprint $table): void {
            $table->string('color', 7)->nullable();
            $table->string('hover_color', 7)->nullable();
            $table->string('text_color', 7)->nullable();
            $table->decimal('size', 4, 2)->nullable();
            $table->string('shape', 20)->nullable();
            $table->string('label_visibility', 20)->nullable();
            $table->boolean('pulse_enabled')->nullable();
        });

        Schema::create('project_360_scene_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_360_tour_id')->constrained('project_360_tours')->cascadeOnDelete();
            $table->foreignId('panorama_id')->unique()->constrained('project_assets')->cascadeOnDelete();
            $table->foreignId('floor_plan_id')->nullable()->constrained('project_assets')->nullOnDelete();
            $table->decimal('initial_yaw', 7, 3)->default(0);
            $table->decimal('initial_pitch', 6, 3)->default(0);
            $table->decimal('plan_x', 6, 3)->nullable();
            $table->decimal('plan_y', 6, 3)->nullable();
            $table->timestamps();

            $table->index(
                ['project_360_tour_id', 'floor_plan_id'],
                'p360_scenes_tour_plan_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_360_scene_settings');

        Schema::table('project_360_hotspots', function (Blueprint $table): void {
            $table->dropColumn([
                'color',
                'hover_color',
                'text_color',
                'size',
                'shape',
                'label_visibility',
                'pulse_enabled',
            ]);
        });

        Schema::table('project_360_tours', function (Blueprint $table): void {
            $table->dropColumn([
                'accent_color',
                'hotspot_color',
                'hotspot_hover_color',
                'hotspot_text_color',
                'hotspot_size',
                'hotspot_shape',
                'hotspot_label_visibility',
                'hotspot_pulse_enabled',
            ]);
        });
    }
};
