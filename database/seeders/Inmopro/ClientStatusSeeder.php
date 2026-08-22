<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\ClientStatus;
use Illuminate\Database\Seeder;

class ClientStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            ['name' => 'Nuevo', 'code' => 'NUEVO', 'description' => 'Cliente recién ingresado al seguimiento.', 'color' => '#64748b', 'sort_order' => 1],
            ['name' => 'Contactado', 'code' => 'CONTACTADO', 'description' => 'Ya hubo un primer contacto.', 'color' => '#0ea5e9', 'sort_order' => 2],
            ['name' => 'Interesado', 'code' => 'INTERESADO', 'description' => 'Muestra interés comercial.', 'color' => '#8b5cf6', 'sort_order' => 3],
            ['name' => 'Visita', 'code' => 'VISITA', 'description' => 'Visita agendada o realizada.', 'color' => '#f59e0b', 'sort_order' => 4],
            ['name' => 'Negociación', 'code' => 'NEGOCIACION', 'description' => 'En negociación de condiciones.', 'color' => '#ea580c', 'sort_order' => 5],
            ['name' => 'Cerrado ganado', 'code' => 'CERRADO_GANADO', 'description' => 'Cierre exitoso.', 'color' => '#16a34a', 'sort_order' => 6],
            ['name' => 'Cerrado perdido', 'code' => 'CERRADO_PERDIDO', 'description' => 'Cierre sin venta.', 'color' => '#dc2626', 'sort_order' => 7],
        ];

        foreach ($statuses as $status) {
            ClientStatus::updateOrCreate(
                ['code' => $status['code']],
                $status + ['is_active' => true]
            );
        }
    }
}
