import { Head, Link } from '@inertiajs/react';
import { LandPlot } from 'lucide-react';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proyectos', href: '/crm/projects' },
    { title: 'Detalle', href: '#' },
];

export default function CrmProjectsShow({ project, lots: lotList }: { project: ProjectDetail; lots: LotRow[] }) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />

            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">{project.name}</h1>
                    <p className="text-sm text-muted-foreground">{project.location}</p>
                </div>

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
                                    <thead className="border-b border-border text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Manzana</th>
                                            <th className="px-4 py-3 font-medium">Lote</th>
                                            <th className="hidden px-4 py-3 font-medium md:table-cell">Área</th>
                                            <th className="px-4 py-3 font-medium">Precio</th>
                                            <th className="px-4 py-3 font-medium">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lotList.map((lot) => (
                                            <tr key={lot.id} className="border-b border-border last:border-0">
                                                <td className="px-4 py-3">{lot.block ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={lots.show(lot.id)}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {lot.number ?? '—'}
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
            </div>
        </CrmLayout>
    );
}
