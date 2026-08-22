<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\ClientTag;
use Illuminate\Database\Seeder;

class ClientTagSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tags = [
            ['name' => 'WhatsApp', 'code' => 'WHATSAPP', 'description' => 'Preferencia de contacto por WhatsApp.', 'color' => '#22c55e', 'sort_order' => 1],
            ['name' => 'Llamar', 'code' => 'LLAMAR', 'description' => 'Requiere llamada telefónica.', 'color' => '#3b82f6', 'sort_order' => 2],
            ['name' => 'Caliente', 'code' => 'CALIENTE', 'description' => 'Alta probabilidad de cierre.', 'color' => '#ef4444', 'sort_order' => 3],
            ['name' => 'Frío', 'code' => 'FRIO', 'description' => 'Bajo interés actual.', 'color' => '#64748b', 'sort_order' => 4],
            ['name' => 'No contesta', 'code' => 'NO_CONTESTA', 'description' => 'No responde a contactos.', 'color' => '#a855f7', 'sort_order' => 5],
            ['name' => 'Referido', 'code' => 'REFERIDO', 'description' => 'Llegó por referido.', 'color' => '#14b8a6', 'sort_order' => 6],
        ];

        foreach ($tags as $tag) {
            ClientTag::updateOrCreate(
                ['code' => $tag['code']],
                $tag + ['is_active' => true]
            );
        }
    }
}
