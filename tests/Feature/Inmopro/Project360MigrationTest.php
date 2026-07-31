<?php

namespace Tests\Feature\Inmopro;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class Project360MigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_recovers_after_hotspot_index_creation_failed(): void
    {
        Schema::drop('project_360_share_links');
        Schema::table('project_360_hotspots', function (Blueprint $table): void {
            $table->dropIndex('p360_hotspots_tour_source_idx');
        });

        $migration = require database_path('migrations/2026_07_30_193356_create_project_360_tables.php');
        $migration->up();

        $this->assertTrue(Schema::hasTable('project_360_tours'));
        $this->assertTrue(Schema::hasTable('project_360_hotspots'));
        $this->assertTrue(Schema::hasTable('project_360_share_links'));
        $this->assertTrue(Schema::hasIndex('project_360_hotspots', 'p360_hotspots_tour_source_idx'));
        $this->assertTrue(Schema::hasIndex('project_360_share_links', 'p360_shares_tour_revoked_idx'));
    }
}
