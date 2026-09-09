import { Head, router } from '@inertiajs/react';
import { LifeBuoy, PlusCircle, X } from 'lucide-react';
import { useState } from 'react';
import { AttentionTicketFormModal } from '@/components/crm/attention-tickets/attention-ticket-form-modal';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { WorkflowBadge } from '@/components/crm/workflow-badge';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import { crmSelectClass, crmTableCellClass, crmTableHeadClass, crmTableRowClass } from '@/lib/crm-ui';
import { confirmDelete } from '@/lib/swal';
import attentionTickets from '@/routes/crm/attention-tickets';
import type { BreadcrumbItem } from '@/types';

type TicketRow = {
    id: number;
    status: string;
    notes: string | null;
    created_at: string;
    client: { id: number; name: string; dni: string | null } | null;
    project: { id: number; name: string } | null;
    type: { id: number; name: string; color: string | null } | null;
};

type Option = { id: number; name: string };
type ClientOption = { id: number; name: string; dni: string | null };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tickets', href: '/crm/attention-tickets' }];

type Props = {
    tickets: { data: TicketRow[]; links: PaginationLink[] };
    clients: ClientOption[];
    projects: Option[];
    ticketTypes: Option[];
    filters: {
        status?: string;
        created_from?: string;
        created_to?: string;
    };
};

export default function CrmAttentionTicketsIndex({ tickets, clients, projects, ticketTypes, filters }: Props) {
    const [modalOpen, setModalOpen] = useState(false);

    const navigate = (params: Record<string, unknown>) => {
        router.get(attentionTickets.index().url, { ...filters, ...params }, { preserveState: true, replace: true });
    };

    const clearFilters = () => router.get(attentionTickets.index().url, {}, { preserveState: true, replace: true });

    const hasActiveFilters = Boolean(filters.status || filters.created_from || filters.created_to);

    const cancelTicket = async (id: number) => {
        const confirmed = await confirmDelete('¿Cancelar este ticket?', 'Esta acción no se puede deshacer.');

        if (confirmed) {
            router.post(attentionTickets.cancel(id).url);
        }
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Tickets de atención" />

            <CrmPage>
                <CrmPageHeader
                    title="Tickets de atención"
                    description="Registra seguimientos y atenciones con tus clientes."
                    actions={
                        <Button onClick={() => setModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo ticket
                        </Button>
                    }
                />

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
                                className={crmSelectClass}
                            >
                                <option value="">Todos</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="realizado">Realizado</option>
                                <option value="cancelado">Cancelado</option>
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
                        {tickets.data.length === 0 ? (
                            <EmptyState
                                icon={LifeBuoy}
                                title="No se encontraron tickets"
                                description={
                                    hasActiveFilters
                                        ? 'Prueba ajustando o limpiando los filtros aplicados.'
                                        : 'Registra un ticket para dar seguimiento a una atención con un cliente.'
                                }
                                action={
                                    !hasActiveFilters && (
                                        <Button size="sm" onClick={() => setModalOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Nuevo ticket
                                        </Button>
                                    )
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={crmTableHeadClass}>
                                        <tr>
                                            <th className={crmTableCellClass}>Cliente</th>
                                            <th className={`hidden ${crmTableCellClass} sm:table-cell`}>Proyecto</th>
                                            <th className={`hidden ${crmTableCellClass} md:table-cell`}>Tipo</th>
                                            <th className={crmTableCellClass}>Estado</th>
                                            <th className={crmTableCellClass} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.data.map((ticket) => (
                                            <tr key={ticket.id} className={crmTableRowClass}>
                                                <td className={crmTableCellClass}>{ticket.client?.name ?? '—'}</td>
                                                <td className={`hidden ${crmTableCellClass} sm:table-cell`}>{ticket.project?.name ?? '—'}</td>
                                                <td className={`hidden ${crmTableCellClass} md:table-cell`}>{ticket.type?.name ?? '—'}</td>
                                                <td className={crmTableCellClass}>
                                                    <WorkflowBadge status={ticket.status} />
                                                </td>
                                                <td className={`${crmTableCellClass} text-right`}>
                                                    {ticket.status === 'pendiente' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => cancelTicket(ticket.id)}
                                                        >
                                                            Cancelar
                                                        </Button>
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

                <Pagination links={tickets.links} />
            </CrmPage>

            <AttentionTicketFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                clients={clients}
                projects={projects}
                ticketTypes={ticketTypes}
            />
        </CrmLayout>
    );
}
