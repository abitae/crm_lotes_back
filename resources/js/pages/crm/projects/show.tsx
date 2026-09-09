import { Head, Link } from '@inertiajs/react';
import { LandPlot } from 'lucide-react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatArea, formatMoney } from '@/lib/crm-format';
import { crmTableCellClass, crmTableHeadClass, crmTableRowClass } from '@/lib/crm-ui';
import lots from '@/routes/crm/lots';
import type { BreadcrumbItem } from '@/types';

type LotStatus = { code: string; name: string; color: string | null };

type LotRow = {
    id: number;
    block: string | null;
    number: string | null;
    area: number | string | null;
    price: number | string | null;
    status: LotStatus | null;
};

type ProjectDetail = {
    id: number;
    name: string;
    location: string | null;
    total_lots: number | null;
};

export default function CrmProjectsShow({ project, lots: lotList }: { project: ProjectDetail; lots: LotRow[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Proyectos', href: '/crm/projects' },
        { title: project.name, href: `/crm/projects/${project.id}` },
    ];

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />

            <CrmPage>
                <CrmPageHeader
                    title={project.name}
                    description={`${lotList.length} lotes en inventario.`}
                />

                <Card>
                    <CardContent className="p-0">
                        {lotList.length === 0 ? (
                            <EmptyState
                                icon={LandPlot}
                                title="Este proyecto aún no tiene lotes"
                                description="Cuando se registren lotes en este proyecto, aparecerán aquí."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={crmTableHeadClass}>
                                        <tr>
                                            <th className={crmTableCellClass}>Manzana</th>
                                            <th className={crmTableCellClass}>Lote</th>
                                            <th className={`hidden ${crmTableCellClass} md:table-cell`}>Área</th>
                                            <th className={crmTableCellClass}>Precio</th>
                                            <th className={crmTableCellClass}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lotList.map((lot) => (
                                            <tr key={lot.id} className={crmTableRowClass}>
                                                <td className={crmTableCellClass}>{lot.block ?? '—'}</td>
                                                <td className={crmTableCellClass}>
                                                    <Link
                                                        href={lots.show(lot.id)}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {lot.number ?? '—'}
                                                    </Link>
                                                </td>
                                                <td className={`hidden ${crmTableCellClass} md:table-cell`}>
                                                    {formatArea(lot.area)}
                                                </td>
                                                <td className={crmTableCellClass}>{formatMoney(lot.price)}</td>
                                                <td className={crmTableCellClass}>
                                                    {lot.status ? (
                                                        <StatusBadge color={lot.status.color}>{lot.status.name}</StatusBadge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </CrmPage>
        </CrmLayout>
    );
}
