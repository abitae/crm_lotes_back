<?php

namespace App\Exports\Inmopro;

use App\Models\Inmopro\Client;
use App\Support\ClientPhoneGuard;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ClientsExport implements FromCollection, WithHeadings
{
    /**
     * @param  Collection<int, Client>  $clients
     */
    public function __construct(
        private Collection $clients
    ) {}

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Nombre',
            'DNI',
            'Telefono',
            'Email',
            'Tipo cliente',
            'Ciudad',
            'Departamento',
            'Asesor',
            'Equipo',
            'Lotes',
            'Fecha registro',
            'Referido por',
        ];
    }

    /**
     * @return Collection<int, array<int, string|null|int>>
     */
    public function collection(): Collection
    {
        return $this->clients->map(static function (Client $client): array {
            return [
                $client->name,
                $client->dni,
                ClientPhoneGuard::visible($client->phone),
                $client->email,
                $client->type?->name,
                $client->city?->name,
                $client->city?->department,
                $client->advisor?->name,
                $client->advisor?->team?->name,
                $client->lots_count ?? 0,
                $client->created_at?->format('d/m/Y'),
                $client->referred_by,
            ];
        });
    }
}
