<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('advisor_reminders', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->change();
            $table->string('google_event_id')->nullable()->unique()->after('notified_at');
            $table->string('source', 20)->default('crm')->after('google_event_id');
            $table->timestamp('google_updated_at')->nullable()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('advisor_reminders', function (Blueprint $table) {
            $table->dropColumn(['google_event_id', 'source', 'google_updated_at']);
        });
    }
};
