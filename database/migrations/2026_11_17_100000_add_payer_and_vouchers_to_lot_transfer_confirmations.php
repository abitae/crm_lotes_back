<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEGACY_EVIDENCE_PATH = 'legacy/sin-evidencia';

    public function up(): void
    {
        Schema::table('lot_transfer_confirmations', function (Blueprint $table): void {
            $table->string('payer_name')->nullable()->after('transfer_amount');
            $table->string('payer_dni', 20)->nullable()->after('payer_name');
            $table->string('evidence_path')->nullable()->change();
        });

        Schema::create('lot_transfer_vouchers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lot_transfer_confirmation_id')->constrained('lot_transfer_confirmations')->cascadeOnDelete();
            $table->string('bank', 40)->nullable();
            $table->string('bank_other')->nullable();
            $table->decimal('amount', 15, 2)->nullable();
            $table->string('operation_number', 60)->nullable();
            $table->string('image_path');
            $table->timestamps();

            $table->index(['bank', 'operation_number']);
        });

        $now = now();

        DB::table('lot_transfer_confirmations')
            ->leftJoin('lots', 'lots.id', '=', 'lot_transfer_confirmations.lot_id')
            ->select([
                'lot_transfer_confirmations.id',
                'lot_transfer_confirmations.evidence_path',
                'lot_transfer_confirmations.transfer_amount',
                'lots.client_name',
                'lots.client_dni',
            ])
            ->orderBy('lot_transfer_confirmations.id')
            ->chunk(200, function ($rows) use ($now): void {
                foreach ($rows as $row) {
                    DB::table('lot_transfer_confirmations')
                        ->where('id', $row->id)
                        ->whereNull('payer_name')
                        ->update([
                            'payer_name' => $row->client_name,
                            'payer_dni' => $row->client_dni,
                        ]);

                    if (empty($row->evidence_path) || $row->evidence_path === self::LEGACY_EVIDENCE_PATH) {
                        continue;
                    }

                    DB::table('lot_transfer_vouchers')->insert([
                        'lot_transfer_confirmation_id' => $row->id,
                        'bank' => null,
                        'bank_other' => null,
                        'amount' => $row->transfer_amount,
                        'operation_number' => null,
                        'image_path' => $row->evidence_path,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_transfer_vouchers');

        Schema::table('lot_transfer_confirmations', function (Blueprint $table): void {
            $table->dropColumn(['payer_name', 'payer_dni']);
        });
    }
};
