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
        Schema::create('client_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('description')->nullable();
            $table->string('color', 20)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('client_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('description')->nullable();
            $table->string('color', 20)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('client_status_id')
                ->nullable()
                ->after('client_type_id')
                ->constrained('client_statuses')
                ->nullOnDelete();
        });

        Schema::create('client_client_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('client_tag_id')->constrained('client_tags')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['client_id', 'client_tag_id']);
        });

        Schema::create('client_status_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('from_status_id')->nullable()->constrained('client_statuses')->nullOnDelete();
            $table->foreignId('to_status_id')->nullable()->constrained('client_statuses')->nullOnDelete();
            $table->foreignId('advisor_id')->nullable()->constrained('advisors')->nullOnDelete();
            $table->foreignId('reminder_id')->nullable()->constrained('advisor_reminders')->nullOnDelete();
            $table->timestamps();

            $table->index(['client_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_status_changes');
        Schema::dropIfExists('client_client_tag');

        Schema::table('clients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('client_status_id');
        });

        Schema::dropIfExists('client_tags');
        Schema::dropIfExists('client_statuses');
    }
};
