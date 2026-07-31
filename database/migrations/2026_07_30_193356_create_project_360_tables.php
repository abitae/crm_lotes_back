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
        if (! Schema::hasTable('project_360_tours')) {
            Schema::create('project_360_tours', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('project_id')->unique()->constrained('projects')->cascadeOnDelete();
                $table->foreignId('start_panorama_id')->nullable()->constrained('project_assets')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('project_360_hotspots')) {
            Schema::create('project_360_hotspots', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('project_360_tour_id')->constrained('project_360_tours')->cascadeOnDelete();
                $table->foreignId('source_panorama_id')->constrained('project_assets')->cascadeOnDelete();
                $table->foreignId('target_panorama_id')->constrained('project_assets')->cascadeOnDelete();
                $table->string('label', 100);
                $table->decimal('yaw', 7, 3);
                $table->decimal('pitch', 6, 3);
                $table->timestamps();
            });
        }

        if (! Schema::hasIndex('project_360_hotspots', 'p360_hotspots_tour_source_idx')) {
            Schema::table('project_360_hotspots', function (Blueprint $table): void {
                $table->index(
                    ['project_360_tour_id', 'source_panorama_id'],
                    'p360_hotspots_tour_source_idx',
                );
            });
        }

        if (! Schema::hasTable('project_360_share_links')) {
            Schema::create('project_360_share_links', function (Blueprint $table): void {
                $table->ulid('id')->primary();
                $table->foreignId('project_360_tour_id')->constrained('project_360_tours')->cascadeOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('label', 100)->nullable();
                $table->timestamp('last_accessed_at')->nullable();
                $table->timestamp('revoked_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasIndex('project_360_share_links', 'p360_shares_tour_revoked_idx')) {
            Schema::table('project_360_share_links', function (Blueprint $table): void {
                $table->index(
                    ['project_360_tour_id', 'revoked_at'],
                    'p360_shares_tour_revoked_idx',
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_360_share_links');
        Schema::dropIfExists('project_360_hotspots');
        Schema::dropIfExists('project_360_tours');
    }
};
