<?php

namespace App\Exports\Inmopro;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ClientsTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Nombre (*)',
            'DNI',
            'Telefono (*)',
            'Email',
            'Referido por',
            'Tipo cliente (*)',
            'Ciudad (*)',
            'Asesor (*)',
            'Fecha registro (DD/MM/AAAA HH:MM)',
        ];
    }

    /**
     * @return array<int, array<int, string>>
     */
    public function array(): array
    {
        return [
            [
                'Cliente Ejemplo',
                '12345678',
                '987654321',
                'cliente@demo.com',
                'Campana digital',
                'CONTADO',
                'LIMA',
                'Asesor Demo',
                '28/01/2026 15:23',
            ],
            [
                'Leyenda: (*) = obligatorio. DNI es opcional. Tipo cliente, Ciudad y Asesor deben coincidir con el catalogo. Ciudad en mayusculas (se crea si no existe). Fecha vacia = fecha actual al importar. Formato fecha: DD/MM/AAAA HH:MM.',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 22,
            'B' => 14,
            'C' => 16,
            'D' => 24,
            'E' => 18,
            'F' => 18,
            'G' => 16,
            'H' => 18,
            'I' => 34,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getStyle('A1:I1')->getFont()->setBold(true);
        $sheet->getStyle('A1:I1')->getAlignment()->setWrapText(true);
        $sheet->getStyle('A1:I1')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(30);

        foreach (['A1', 'C1', 'F1', 'H1'] as $cell) {
            $sheet->getStyle($cell)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('DCFCE7');
            $sheet->getStyle($cell)->getFont()->getColor()->setRGB('166534');
        }

        foreach (['B1', 'D1', 'E1', 'G1', 'I1'] as $cell) {
            $sheet->getStyle($cell)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('F1F5F9');
            $sheet->getStyle($cell)->getFont()->getColor()->setRGB('475569');
        }

        $sheet->getStyle('A3')->getFont()->setItalic(true)->setSize(9);
        $sheet->getStyle('A3')->getFont()->getColor()->setRGB('64748B');
        $sheet->mergeCells('A3:I3');

        return [];
    }
}
