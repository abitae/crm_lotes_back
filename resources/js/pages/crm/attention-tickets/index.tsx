import { Head, router } from '@inertiajs/react';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { AttentionTicketFormModal } from '@/components/crm/attention-tickets/attention-ticket-form-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
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

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pendiente: 'secondary',
    realizado: 'default',
    cancelado: 'destructive',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tickets de atención', href: '/crm/attention-tickets' }];

type Props = {
    tickets: TicketRow[];
    clients: ClientOption[];
    projects: Option[];
    ticketTypes: Option[];
};

export default function CrmAttentionTicketsIndex({ tickets, clients, projects, ticketTypes }: Props) {
    const [modalOpen, setModalOpen] = useState(false);

    const cancelTicket = (id: number) => {
        if (confirm('¿Cancelar este ticket de atención?')) {
            router.post(attentionTickets.cancel(id).url);
        }
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Tickets de atención" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex justify-end">
                    <Button onClick={() => setModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo ticket
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Cliente</th>
                                        <th className="px-4 py-3 font-medium">Proyecto</th>
                                        <th className="px-4 py-3 font-medium">Tipo</th>
                                        <th className="px-4 py-3 font-medium">Estado</th>
                                        <th className="px-4 py-3 font-medium" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.id} className="border-b border-border last:border-0">
                                            <td className="px-4 py-3">{ticket.client?.name ?? '—'}</td>
                                            <td className="px-4 py-3">{ticket.project?.name ?? '—'}</td>
                                            <td className="px-4 py-3">{ticket.type?.name ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={statusVariant[ticket.status] ?? 'outline'}>
                                                    {ticket.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
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
                                    {tickets.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                No tienes tickets de atención registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
