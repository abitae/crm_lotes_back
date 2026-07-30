<?php

namespace App\Exports\Inmopro;

use App\Models\Inmopro\Lot;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class LotTransferConfirmationsExport implements FromCollection, WithHeadings
{
    /**
     * @param  Collection<int, Lot>  $lots
     */
    public function __construct(
        private Collection $lots
    ) {}

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Proyecto',
            'Lote',
            'Cliente',
            'DNI',
            'Telefono',
            'Asesor',
            'Fecha reserva',
            'Fecha limite',
            'Precio',
            'Separacion',
            'Saldo restante',
            'Estado lote',
            'Estado revision',
            'Anotaciones',
        ];
    }

    /**
     * @return Collection<int, array<int, string|null>>
     */
    public function collection(): Collection
    {
        return $this->lots->map(static function (Lot $lot): array {
            $transfer = $lot->latestTransferConfirmation;

            return [
                $lot->project?->name,
                "{$lot->block}-{$lot->number}",
                $lot->client?->name ?? $lot->client_name,
                $lot->client?->dni ?? $lot->client_dni,
                $lot->client?->phone,
                $lot->advisor?->name,
                $lot->contract_date?->format('d/m/Y'),
                $lot->payment_limit_date?->format('d/m/Y'),
                self::formatMoney($lot->price),
                self::formatMoney($lot->advance),
                self::formatMoney($lot->remaining_balance),
                $lot->status?->name,
                $transfer?->status,
                $lot->notes,
            ];
        });
    }

    private static function formatMoney(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return number_format((float) $value, 2, '.', '');
    }
}
