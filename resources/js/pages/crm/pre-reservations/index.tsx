import { Head, router } from '@inertiajs/react';
import { FileCheck, X } from 'lucide-react';
import { EmptyState } from '@/components/crm/empty-state';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import preReservationsRoute from '@/routes/crm/pre-reservations';
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
    filters: {
        status?: string;
        created_from?: string;
        created_to?: string;
    };
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
    PENDIENTE: 'secondary',
    APROBADA: 'default',
    RECHAZADA: 'destructive',
    EXPIRADA: 'destructive',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pre-reservas', href: '/crm/pre-reservations' }];
const SELECT_CLASS = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm';

export default function CrmPreReservationsIndex({ preReservations, filters }: Props) {
    const navigate = (params: Record<string, unknown>) => {
        router.get(preReservationsRoute.index().url, { ...filters, ...params }, { preserveState: true, replace: true });
    };

    const clearFilters = () => router.get(preReservationsRoute.index().url, {}, { preserveState: true, replace: true });

    const hasActiveFilters = Boolean(filters.status || filters.created_from || filters.created_to);

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-reservas" />

            <div className="flex flex-col gap-6 p-6">
                <Card>
                    <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <Label htmlFor="filter-status" className="mb-1 block text-xs text-muted-foreground">
                                Estado
                            </Label>
                            <select
                                id="filter-status"
                                defaultValue={filters.status ?? ''}
                                onChange={(e) => navigate({ status: e.target.value || undefined })}
                                className={SELECT_CLASS}
                            >
                                <option value="">Todos</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="APROBADA">Aprobada</option>
                                <option value="RECHAZADA">Rechazada</option>
                                <option value="EXPIRADA">Expirada</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="filter-created-from" className="mb-1 block text-xs text-muted-foreground">
                                Desde
                            </Label>
                            <Input
                                id="filter-created-from"
                                type="date"
                                defaultValue={filters.created_from ?? ''}
                                onChange={(e) => navigate({ created_from: e.target.value || undefined })}
                                className="h-9"
                            />
                        </div>
                        <div>
                            <Label htmlFor="filter-created-to" className="mb-1 block text-xs text-muted-foreground">
                                Hasta
                            </Label>
                            <Input
                                id="filter-created-to"
                                type="date"
                                defaultValue={filters.created_to ?? ''}
                                onChange={(e) => navigate({ created_to: e.target.value || undefined })}
                                className="h-9"
                            />
                        </div>
                        {hasActiveFilters && (
                            <div className="flex items-end">
                                <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                                    <X className="mr-1.5 h-3.5 w-3.5" />
                                    Limpiar filtros
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        {preReservations.data.length === 0 ? (
                            <EmptyState
                                icon={FileCheck}
                                title="No se encontraron pre-reservas"
                                description={
                                    hasActiveFilters
                                        ? 'Prueba ajustando o limpiando los filtros aplicados.'
                                        : 'Cuando registres una pre-reserva desde un lote disponible, aparecerá aquí.'
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-border text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Cliente</th>
                                            <th className="px-4 py-3 font-medium">Lote</th>
                                            <th className="hidden px-4 py-3 font-medium sm:table-cell">Monto</th>
                                            <th className="px-4 py-3 font-medium">Estado</th>
                                            <th className="hidden px-4 py-3 font-medium md:table-cell">Fecha</th>
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
                                                <td className="hidden px-4 py-3 sm:table-cell">{pr.amount}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={statusVariant[pr.status] ?? 'secondary'}>
                                                        {pr.status}
                                                    </Badge>
                                                </td>
                                                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                                    {new Date(pr.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Pagination links={preReservations.links} />
            </div>
        </CrmLayout>
    );
}
