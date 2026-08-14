<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_360_labels', function (Blueprint $table): void {
            $table->string('shape', 20)->default('rounded')->after('rotation');
            $table->string('border_color', 7)->default('#334155')->after('shape');
            $table->decimal('border_width', 4, 2)->default(0.03)->after('border_color');
            $table->string('visibility', 20)->default('always')->after('border_width');
        });

        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->string('label_shape', 20)->default('rounded')->after('label_background_color');
            $table->string('label_border_color', 7)->default('#334155')->after('label_shape');
            $table->decimal('label_border_width', 4, 2)->default(0.03)->after('label_border_color');
            $table->string('label_visibility', 20)->default('always')->after('label_rotation');
        });
    }

    public function down(): void
    {
        Schema::table('project_360_labels', function (Blueprint $table): void {
            $table->dropColumn(['shape', 'border_color', 'border_width', 'visibility']);
        });

        Schema::table('project_360_polygons', function (Blueprint $table): void {
            $table->dropColumn([
                'label_shape',
                'label_border_color',
                'label_border_width',
                'label_visibility',
            ]);
        });
    }
};
