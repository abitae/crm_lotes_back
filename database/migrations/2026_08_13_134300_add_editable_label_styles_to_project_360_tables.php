<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_360_labels', function (Blueprint $table): void {
            $table->string('background_color', 7)->default('#0f172a')->after('color');
            $table->string('font', 32)->default('roboto')->after('background_color');
            $table->decimal('rotation', 6, 2)->default(0)->after('size');
        });

        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->string('label_text', 120)->nullable()->after('description');
            $table->string('label_color', 7)->default('#ffffff')->after('label_text');
            $table->string('label_background_color', 7)->default('#0f172a')->after('label_color');
            $table->string('label_font', 32)->default('roboto')->after('label_background_color');
            $table->decimal('label_size', 4, 2)->default(1)->after('label_font');
            $table->decimal('label_rotation', 6, 2)->default(0)->after('label_size');
            $table->decimal('label_yaw', 7, 3)->nullable()->after('label_rotation');
            $table->decimal('label_pitch', 6, 3)->nullable()->after('label_yaw');
        });
    }

    public function down(): void
    {
        Schema::table('project_360_labels', function (Blueprint $table): void {
            $table->dropColumn(['background_color', 'font', 'rotation']);
        });

        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->dropColumn([
                'label_text',
                'label_color',
                'label_background_color',
                'label_font',
                'label_size',
                'label_rotation',
                'label_yaw',
                'label_pitch',
            ]);
        });
    }
};
