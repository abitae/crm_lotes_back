<?php

use App\Models\Inmopro\Project;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->string('tour_360_url')->nullable()->after('tipo_web');
        });

        $service = app(Project360TourService::class);

        Project::query()
            ->whereHas('panoramas', fn ($query) => $query->where('is_active', true))
            ->each(fn (Project $project) => $service->syncTour360Url($project));
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropColumn('tour_360_url');
        });
    }
};
