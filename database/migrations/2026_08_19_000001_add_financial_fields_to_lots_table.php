<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->decimal('list_price', 15, 2)->nullable()->after('price');
            $table->decimal('sale_price', 15, 2)->nullable()->after('list_price');
            $table->decimal('acquisition_cost', 15, 2)->nullable()->after('sale_price');
        });

        DB::table('lots')->update(['list_price' => DB::raw('price')]);

        DB::table('lots')
            ->whereIn('lot_status_id', function ($query) {
                $query->select('id')->from('lot_statuses')->whereIn('code', ['RESERVADO', 'CUOTAS', 'TRANSFERIDO']);
            })
            ->update(['sale_price' => DB::raw('price')]);
    }

    public function down(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->dropColumn(['list_price', 'sale_price', 'acquisition_cost']);
        });
    }
};
