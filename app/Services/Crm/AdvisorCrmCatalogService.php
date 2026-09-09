<?php

namespace App\Services\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use Illuminate\Support\Str;

class AdvisorCrmCatalogService
{
    /**
     * @return list<array{name: string, code: string, description: string, color: string, sort_order: int}>
     */
    public static function defaultStatuses(): array
    {
        return [
            ['name' => 'Nuevo', 'code' => 'NUEVO', 'description' => 'Cliente recién ingresado al seguimiento.', 'color' => '#64748b', 'sort_order' => 1],
            ['name' => 'Contactado', 'code' => 'CONTACTADO', 'description' => 'Ya hubo un primer contacto.', 'color' => '#0ea5e9', 'sort_order' => 2],
            ['name' => 'Interesado', 'code' => 'INTERESADO', 'description' => 'Muestra interés comercial.', 'color' => '#8b5cf6', 'sort_order' => 3],
            ['name' => 'Visita', 'code' => 'VISITA', 'description' => 'Visita agendada o realizada.', 'color' => '#f59e0b', 'sort_order' => 4],
            ['name' => 'Negociación', 'code' => 'NEGOCIACION', 'description' => 'En negociación de condiciones.', 'color' => '#ea580c', 'sort_order' => 5],
            ['name' => 'Cerrado ganado', 'code' => 'CERRADO_GANADO', 'description' => 'Cierre exitoso.', 'color' => '#16a34a', 'sort_order' => 6],
            ['name' => 'Cerrado perdido', 'code' => 'CERRADO_PERDIDO', 'description' => 'Cierre sin venta.', 'color' => '#dc2626', 'sort_order' => 7],
        ];
    }

    /**
     * @return list<array{name: string, code: string, description: string, color: string, sort_order: int}>
     */
    public static function defaultTags(): array
    {
        return [
            ['name' => 'WhatsApp', 'code' => 'WHATSAPP', 'description' => 'Preferencia de contacto por WhatsApp.', 'color' => '#22c55e', 'sort_order' => 1],
            ['name' => 'Llamar', 'code' => 'LLAMAR', 'description' => 'Requiere llamada telefónica.', 'color' => '#3b82f6', 'sort_order' => 2],
            ['name' => 'Caliente', 'code' => 'CALIENTE', 'description' => 'Alta probabilidad de cierre.', 'color' => '#ef4444', 'sort_order' => 3],
            ['name' => 'Frío', 'code' => 'FRIO', 'description' => 'Bajo interés actual.', 'color' => '#64748b', 'sort_order' => 4],
            ['name' => 'No contesta', 'code' => 'NO_CONTESTA', 'description' => 'No responde a contactos.', 'color' => '#a855f7', 'sort_order' => 5],
            ['name' => 'Referido', 'code' => 'REFERIDO', 'description' => 'Llegó por referido.', 'color' => '#14b8a6', 'sort_order' => 6],
        ];
    }

    public function ensureDefaults(Advisor $advisor): void
    {
        if (ClientStatus::query()->where('advisor_id', $advisor->id)->doesntExist()) {
            foreach (self::defaultStatuses() as $status) {
                ClientStatus::query()->create($status + [
                    'advisor_id' => $advisor->id,
                    'is_active' => true,
                ]);
            }
        }

        if (ClientTag::query()->where('advisor_id', $advisor->id)->doesntExist()) {
            foreach (self::defaultTags() as $tag) {
                ClientTag::query()->create($tag + [
                    'advisor_id' => $advisor->id,
                    'is_active' => true,
                ]);
            }
        }
    }

    public function uniqueCode(Advisor $advisor, string $name, string $type, ?int $ignoreId = null): string
    {
        $base = strtoupper((string) Str::of($name)->ascii()->slug('_'));

        if ($base === '') {
            $base = $type === 'tag' ? 'ETIQUETA' : 'ESTADO';
        }

        $code = $base;
        $suffix = 2;
        $query = $type === 'tag'
            ? ClientTag::query()->where('advisor_id', $advisor->id)
            : ClientStatus::query()->where('advisor_id', $advisor->id);

        while ((clone $query)->when($ignoreId, fn ($builder) => $builder->whereKeyNot($ignoreId))->where('code', $code)->exists()) {
            $code = $base.'_'.$suffix;
            $suffix++;
        }

        return $code;
    }
}
