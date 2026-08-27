import { Head } from '@inertiajs/react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import type { BreadcrumbItem } from '@/types';

type PreReservationRow = {
    id: number;
    status: string;
    amount: number | string;
    created_at: string;
    lot: { id: number; block: string | null; number: string | null; project: { name: string } | null } | null;
    client: { id: number; name: string } | null;
};

type Props = {
    preReservations: {
        data: PreReservationRow[];
        links: PaginationLink[];
    };
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
    PENDIENTE: 'secondary',
    APROBADA: 'default',
    RECHAZADA: 'destructive',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pre-reservas', href: '/crm/pre-reservations' }];

export default function CrmPreReservationsIndex({ preReservations }: Props) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-reservas" />

            <div className="flex flex-col gap-6 p-6">
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Cliente</th>
                                        <th className="px-4 py-3 font-medium">Lote</th>
                                        <th className="px-4 py-3 font-medium">Monto</th>
                                        <th className="px-4 py-3 font-medium">Estado</th>
                                        <th className="px-4 py-3 font-medium">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preReservations.data.map((pr) => (
                                        <tr key={pr.id} className="border-b border-border last:border-0">
                                            <td className="px-4 py-3">{pr.client?.name ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                {pr.lot?.project?.name ?? ''} Mz. {pr.lot?.block ?? '—'} Lt.{' '}
                                                {pr.lot?.number ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">{pr.amount}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={statusVariant[pr.status] ?? 'secondary'}>
                                                    {pr.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(pr.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {preReservations.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                No tienes pre-reservas registradas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Pagination links={preReservations.links} />
            </div>
        </CrmLayout>
    );
}
