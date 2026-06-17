<?php

namespace App\Services\Inmopro\Reports;

class ReportsCatalog
{
    /**
     * @return list<array{slug: string, title: string, description: string, route: string, filters: list<string>}>
     */
    public static function all(): array
    {
        return [
            [
                'slug' => 'sales',
                'title' => 'Ventas por proyecto o equipo',
                'description' => 'Consolidado de lotes transferidos por fecha de escritura, ponderado por % meta del tipo de proyecto.',
                'route' => 'inmopro.reports.sales.index',
                'filters' => ['Proyecto', 'Equipo', 'Vendedor', 'Rango de fechas'],
            ],
            [
                'slug' => 'top-advisors',
                'title' => 'Top cazadores (vendedores)',
                'description' => 'Ranking por lotes transferidos según fecha de escritura, ponderado por % meta del tipo de proyecto.',
                'route' => 'inmopro.reports.top-advisors.index',
                'filters' => ['Equipo', 'Proyecto', 'Rango de fechas'],
            ],
            [
                'slug' => 'reservations',
                'title' => 'Detalle de reservas',
                'description' => 'Listado de reservas y pre-reservas con datos del cliente, lote y fechas.',
                'route' => 'inmopro.reports.reservations.index',
                'filters' => ['Proyecto', 'Equipo', 'Rango de fechas'],
            ],
            [
                'slug' => 'contracts-week',
                'title' => 'Contratos de la semana',
                'description' => 'Reservados y transferidos dentro de la semana calendario seleccionada.',
                'route' => 'inmopro.reports.contracts-week.index',
                'filters' => ['Semana'],
            ],
            [
                'slug' => 'expired-contracts',
                'title' => 'Contratos vencidos',
                'description' => 'Reservas con fecha límite de pago vencida y aún sin transferir.',
                'route' => 'inmopro.reports.expired-contracts.index',
                'filters' => ['Proyecto', 'Equipo', 'Vendedor'],
            ],
            [
                'slug' => 'project-inventory',
                'title' => 'Inventario comercial por proyecto',
                'description' => 'Conteo de lotes libres, reservados y transferidos; filtro propio o tercero (datero).',
                'route' => 'inmopro.reports.project-inventory.index',
                'filters' => ['Proyecto', 'Origen cliente'],
            ],
            [
                'slug' => 'transfers-by-project',
                'title' => 'Transferencias por proyecto (mensual)',
                'description' => 'Monto y cantidad de transferencias aprobadas agrupadas por mes y proyecto.',
                'route' => 'inmopro.reports.transfers-by-project.index',
                'filters' => ['Año', 'Proyecto'],
            ],
            [
                'slug' => 'team-goals',
                'title' => 'Meta grupal por equipo',
                'description' => 'Ventas del periodo vs meta grupal con detalle de lotes por equipo.',
                'route' => 'inmopro.reports.team-goals.index',
                'filters' => ['Equipo', 'Rango de fechas'],
            ],
            [
                'slug' => 'fallen',
                'title' => 'Caídos (reservas vencidas)',
                'description' => 'Reservas vencidas sin transferir, agrupadas por equipo, proyecto o vendedor.',
                'route' => 'inmopro.reports.fallen.index',
                'filters' => ['Dimensión', 'Proyecto', 'Equipo'],
            ],
        ];
    }
}
