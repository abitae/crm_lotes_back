import { Head, Link } from '@inertiajs/react';
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

export default function CrmLotsIndex({ lots: lotList }: { lots: LotRow[] }) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Mis lotes" />

            <div className="p-6">
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Proyecto</th>
                                        <th className="px-4 py-3 font-medium">Manzana / Lote</th>
                                        <th className="px-4 py-3 font-medium">Área</th>
                                        <th className="px-4 py-3 font-medium">Precio</th>
                                        <th className="px-4 py-3 font-medium">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotList.map((lot) => (
                                        <tr key={lot.id} className="border-b border-border last:border-0">
                                            <td className="px-4 py-3">{lot.project?.name ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={lots.show(lot.id)}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">{lot.area ?? '—'}</td>
                                            <td className="px-4 py-3">{lot.price ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                {lot.status ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span
                                                            className="size-2 rounded-full"
                                                            style={{
                                                                backgroundColor: lot.status.color ?? '#94a3b8',
                                                            }}
                                                        />
                                                        {lot.status.name}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {lotList.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                Aún no tienes lotes asignados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
