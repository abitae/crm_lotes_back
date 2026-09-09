import { Head } from '@inertiajs/react';
import { Percent } from 'lucide-react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatDate, formatMoney } from '@/lib/crm-format';
import { crmTableCellClass, crmTableHeadClass, crmTableRowClass } from '@/lib/crm-ui';
import type { BreadcrumbItem } from '@/types';

type CommissionRow = {
    id: number;
    amount: number | string;
    percentage: number | string | null;
    type: string | null;
    date: string;
    lot: { id: number; block: string | null; number: string | null; project: { name: string } | null } | null;
    status: { id: number; name: string; color: string | null } | null;
};

type Props = {
    commissions: {
        data: CommissionRow[];
        links: PaginationLink[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Comisiones', href: '/crm/commissions' }];

export default function CrmCommissionsIndex({ commissions }: Props) {
    const total = commissions.data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Comisiones" />

            <CrmPage>
                <CrmPageHeader
                    title="Comisiones"
                    description="Comisiones generadas por lotes transferidos a tu nombre."
                />

                {commissions.data.length > 0 ? (
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                Total en esta página
                            </p>
                            <p className="mt-1 text-2xl font-semibold">{formatMoney(total)}</p>
                        </CardContent>
                    </Card>
                ) : null}

                <Card>
                    <CardContent className="p-0">
                        {commissions.data.length === 0 ? (
                            <EmptyState
                                icon={Percent}
                                title="No tienes comisiones registradas"
                                description="Las comisiones aparecerán aquí cuando se transfiera un lote a tu nombre."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={crmTableHeadClass}>
                                        <tr>
                                            <th className={crmTableCellClass}>Lote</th>
                                            <th className={crmTableCellClass}>Monto</th>
                                            <th className={`hidden ${crmTableCellClass} sm:table-cell`}>%</th>
                                            <th className={crmTableCellClass}>Estado</th>
                                            <th className={`hidden ${crmTableCellClass} md:table-cell`}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissions.data.map((commission) => (
                                            <tr key={commission.id} className={crmTableRowClass}>
                                                <td className={crmTableCellClass}>
                                                    {commission.lot?.project?.name ?? ''} Mz.{' '}
                                                    {commission.lot?.block ?? '—'} Lt. {commission.lot?.number ?? '—'}
                                                </td>
                                                <td className={`${crmTableCellClass} font-medium`}>
                                                    {formatMoney(commission.amount)}
                                                </td>
                                                <td className={`hidden ${crmTableCellClass} sm:table-cell`}>
                                                    {commission.percentage ?? '—'}
                                                </td>
                                                <td className={crmTableCellClass}>
                                                    {commission.status ? (
                                                        <StatusBadge color={commission.status.color}>
                                                            {commission.status.name}
                                                        </StatusBadge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className={`hidden ${crmTableCellClass} text-muted-foreground md:table-cell`}>
                                                    {formatDate(commission.date)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Pagination links={commissions.links} />
            </CrmPage>
        </CrmLayout>
    );
}
