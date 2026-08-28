import { Head, Link } from '@inertiajs/react';
import { LandPlot } from 'lucide-react';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
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

            <div className="p-6">
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
                                    <thead className="border-b border-border text-left text-muted-foreground">
                                        <tr>
                                            <th className="hidden px-4 py-3 font-medium sm:table-cell">Proyecto</th>
                                            <th className="px-4 py-3 font-medium">Manzana / Lote</th>
                                            <th className="hidden px-4 py-3 font-medium md:table-cell">Área</th>
                                            <th className="px-4 py-3 font-medium">Precio</th>
                                            <th className="px-4 py-3 font-medium">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lotList.map((lot) => (
                                            <tr key={lot.id} className="border-b border-border last:border-0">
                                                <td className="hidden px-4 py-3 sm:table-cell">{lot.project?.name ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={lots.show(lot.id)}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                                                    </Link>
                                                </td>
                                                <td className="hidden px-4 py-3 md:table-cell">{lot.area ?? '—'}</td>
                                                <td className="px-4 py-3">{lot.price ?? '—'}</td>
                                                <td className="px-4 py-3">
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

                <div className="mt-4">
                    <Pagination links={lotsPage.links} />
                </div>
            </div>
        </CrmLayout>
    );
}
