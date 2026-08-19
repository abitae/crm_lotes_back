<?php

namespace App\Exports\Inmopro;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

class ProjectWithLotsTemplateExport implements FromArray, WithTitle
{
    /**
     * @return array<int, array<int, string|int|float|null>>
     */
    public function array(): array
    {
        return [
            [
                'ITEM',
                'NOMBRE CLIENTE',
                'TELEFONO',
                'MZ',
                'LOTE',
                'AREA',
                'PRECIO DE LISTA',
                'PRECIO REAL DE VENTA',
                'COSTO BASE',
                'ADELANTO - SEPARACION',
                'MONTO RESTANTE',
                'FACTURACIÓN',
                'DNI CLIENTE',
                'FECHA LIMITE DE PAGO',
                'ESTADO DE LOTE',
                'N° DE OPERACIÓN S.',
                'FECHA DE CONTRATO',
                'NRO DE CONTRATO',
                'PROYECTO',
            ],
            [1, '', '', 'A', '1A', 91.92, 25900, '', 18000, '', 25900, '', '', '', 'LIBRE', '', '', '', 'Villa Norte - Mito'],
            [2, 'Cliente de ejemplo', '987654321', 'A', '1B', 95.73, 26900, 26500, 18500, 1000, 25500, '', '12345678', '2026-05-30', 'RESERVADO', 'YAPE + EFECTIVO', '2026-05-07', 'CT-001', 'Villa Norte - Mito'],
            [3, '', '', 'B', '1', 120.83, 33900, '', 22000, '', 33900, '', '', '', 'LIBRE', '', '', '', 'Villa Norte - Mito'],
        ];
    }

    public function title(): string
    {
        return 'PROYECTO_MODELO';
    }
}
