<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->after('project_type_id')->constrained('cities')->nullOnDelete();
            $table->string('province')->nullable()->after('city_id');
            $table->string('district')->nullable()->after('province');
            $table->string('project_zone')->nullable()->after('district');
            $table->string('registry_status')->nullable()->after('project_zone');
            $table->string('image_portada')->nullable()->after('registry_status');
            $table->boolean('is_web')->default(false)->after('image_portada');
            $table->string('tipo_web')->nullable()->after('is_web');
        });

        DB::table('projects')->update([
            'is_web' => DB::raw('is_active'),
        ]);
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['city_id']);
            $table->dropColumn([
                'city_id',
                'province',
                'district',
                'project_zone',
                'registry_status',
                'image_portada',
                'is_web',
                'tipo_web',
            ]);
        });
    }
};
