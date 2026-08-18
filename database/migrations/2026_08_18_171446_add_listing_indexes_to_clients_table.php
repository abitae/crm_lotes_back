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
        Schema::table('clients', function (Blueprint $table) {
            $table->string('phone_normalized')->nullable()->after('phone');
            $table->string('dni_normalized')->nullable()->after('dni');
        });

        DB::table('clients')
            ->select(['id', 'phone', 'dni'])
            ->orderBy('id')
            ->chunkById(500, function ($clients): void {
                foreach ($clients as $client) {
                    DB::table('clients')->where('id', $client->id)->update([
                        'phone_normalized' => preg_replace('/\D+/', '', trim((string) $client->phone)) ?: null,
                        'dni_normalized' => preg_replace('/\D+/', '', trim((string) $client->dni)) ?: null,
                    ]);
                }
            });

        Schema::table('clients', function (Blueprint $table) {
            $table->index(['advisor_id', 'name', 'id'], 'clients_advisor_name_id_idx');
            $table->index(['advisor_id', 'client_type_id', 'name', 'id'], 'clients_advisor_type_name_id_idx');
            $table->index(['registered_by_datero_id', 'name', 'id'], 'clients_datero_name_id_idx');
            $table->index(['advisor_id', 'phone_normalized'], 'clients_advisor_phone_idx');
            $table->index(['advisor_id', 'dni_normalized'], 'clients_advisor_dni_idx');
            $table->index(['registered_by_datero_id', 'phone_normalized'], 'clients_datero_phone_idx');
            $table->index(['registered_by_datero_id', 'dni_normalized'], 'clients_datero_dni_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('clients_advisor_name_id_idx');
            $table->dropIndex('clients_advisor_type_name_id_idx');
            $table->dropIndex('clients_datero_name_id_idx');
            $table->dropIndex('clients_advisor_phone_idx');
            $table->dropIndex('clients_advisor_dni_idx');
            $table->dropIndex('clients_datero_phone_idx');
            $table->dropIndex('clients_datero_dni_idx');
            $table->dropColumn(['phone_normalized', 'dni_normalized']);
        });
    }
};
