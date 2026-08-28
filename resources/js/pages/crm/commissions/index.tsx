import { Head } from '@inertiajs/react';
import { Percent } from 'lucide-react';
import { EmptyState } from '@/components/crm/empty-state';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
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
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Comisiones" />

            <div className="flex flex-col gap-6 p-6">
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
                                    <thead className="border-b border-border text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Lote</th>
                                            <th className="px-4 py-3 font-medium">Monto</th>
                                            <th className="hidden px-4 py-3 font-medium sm:table-cell">%</th>
                                            <th className="px-4 py-3 font-medium">Estado</th>
                                            <th className="hidden px-4 py-3 font-medium md:table-cell">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissions.data.map((commission) => (
                                            <tr key={commission.id} className="border-b border-border last:border-0">
                                                <td className="px-4 py-3">
                                                    {commission.lot?.project?.name ?? ''} Mz.{' '}
                                                    {commission.lot?.block ?? '—'} Lt. {commission.lot?.number ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 font-medium">{commission.amount}</td>
                                                <td className="hidden px-4 py-3 sm:table-cell">{commission.percentage ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    {commission.status ? (
                                                        <Badge
                                                            style={{
                                                                backgroundColor: commission.status.color ?? undefined,
                                                            }}
                                                            variant="secondary"
                                                        >
                                                            {commission.status.name}
                                                        </Badge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                                    {new Date(commission.date).toLocaleDateString()}
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
            </div>
        </CrmLayout>
    );
}
