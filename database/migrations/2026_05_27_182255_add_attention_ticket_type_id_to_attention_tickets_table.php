<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attention_tickets', function (Blueprint $table) {
            $table->foreignId('attention_ticket_type_id')
                ->nullable()
                ->after('lot_id')
                ->constrained('attention_ticket_types')
                ->nullOnDelete();
        });

        $generalTypeId = DB::table('attention_ticket_types')->where('code', 'GENERAL')->value('id');

        if ($generalTypeId !== null) {
            DB::table('attention_tickets')
                ->whereNull('attention_ticket_type_id')
                ->update(['attention_ticket_type_id' => $generalTypeId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attention_tickets', function (Blueprint $table) {
            $table->dropForeign(['attention_ticket_type_id']);
            $table->dropColumn('attention_ticket_type_id');
        });
    }
};
