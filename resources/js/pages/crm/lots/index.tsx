import { Head, Link } from '@inertiajs/react';
import { LandPlot } from 'lucide-react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatArea, formatMoney } from '@/lib/crm-format';
import { crmTableCellClass, crmTableHeadClass, crmTableRowClass } from '@/lib/crm-ui';
import lots from '@/routes/crm/lots';
import type { BreadcrumbItem } from '@/types';

type LotRow = {
    id: number;
    block: string | null;
    number: string | null;
    area: number | string | null;
    price: number | string | null;
    project: { id: number; name: string } | null;
    status: { code: string; name: string; color: string | null } | null;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mis lotes', href: '/crm/my-lots' }];

type LotsPage = { data: LotRow[]; links: PaginationLink[] };

export default function CrmLotsIndex({ lots: lotsPage }: { lots: LotsPage }) {
    const lotList = lotsPage.data;

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Mis lotes" />

            <CrmPage>
                <CrmPageHeader
                    title="Mis lotes"
                    description="Lotes asignados a tu nombre para seguimiento y pre-reserva."
                />

                <Card>
                    <CardContent className="p-0">
                        {lotList.length === 0 ? (
                            <EmptyState
                                icon={LandPlot}
                                title="Aún no tienes lotes asignados"
                                description="Cuando se te asigne un lote, aparecerá aquí."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={crmTableHeadClass}>
                                        <tr>
                                            <th className={`hidden ${crmTableCellClass} sm:table-cell`}>Proyecto</th>
                                            <th className={crmTableCellClass}>Manzana / Lote</th>
                                            <th className={`hidden ${crmTableCellClass} md:table-cell`}>Área</th>
                                            <th className={crmTableCellClass}>Precio</th>
                                            <th className={crmTableCellClass}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lotList.map((lot) => (
                                            <tr key={lot.id} className={crmTableRowClass}>
                                                <td className={`hidden ${crmTableCellClass} sm:table-cell`}>
                                                    {lot.project?.name ?? '—'}
                                                </td>
                                                <td className={crmTableCellClass}>
                                                    <Link
                                                        href={lots.show(lot.id)}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
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

                <Pagination links={lotsPage.links} />
            </CrmPage>
        </CrmLayout>
    );
}
