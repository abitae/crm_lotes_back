<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Datero;
use RuntimeException;

class RegisterClientForDateroAction
{
    /**
     * @param  array{name: string, phone: string, city_id: int, dni?: string|null, email?: string|null, referred_by?: string|null}  $fields
     */
    public function execute(Datero $datero, array $fields): Client
    {
        $dateroTypeId = ClientType::query()->where('code', 'DATERO')->value('id');
        if ($dateroTypeId === null) {
            throw new RuntimeException('Falta el tipo de cliente DATERO en la base de datos.');
        }

        return Client::create([
            'name' => $fields['name'],
            'dni' => $fields['dni'] ?? null,
            'phone' => $fields['phone'],
            'email' => $fields['email'] ?? null,
            'referred_by' => $fields['referred_by'] ?? null,
            'city_id' => $fields['city_id'],
            'advisor_id' => $datero->advisor_id,
            'client_type_id' => $dateroTypeId,
            'registered_by_datero_id' => $datero->id,
        ]);
    }
}
