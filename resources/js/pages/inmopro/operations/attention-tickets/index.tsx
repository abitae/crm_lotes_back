import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, Eye, Plus, Ticket } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/date';
import { showSuccessToast } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Project = { id: number; name: string; location?: string | null };
type Client = { id: number; name: string; dni?: string; advisor_id: number; advisor?: { id: number; name: string } | null };
type Advisor = { id: number; name: string };
type TicketType = { id: number; name: string; code: string; color?: string | null; allows_overlap: boolean };
type Lot = { id: number; block: string; number: number } | null;
type DeliveryDeed = { id: number; printed_at: string | null; signed_at: string | null } | null;
type TicketItem = {
    id: number;
    created_at: string;
    scheduled_at: string | null;
    status: string;
    notes: string | null;
    advisor: Advisor | null;
    client: Client | null;
    project: Project | null;
    type: TicketType | null;
    lot: Lot;
    delivery_deed: DeliveryDeed;
};

const initialTicketForm = {
    advisor_id: '',
    client_id: '',
    project_id: '',
    attention_ticket_type_id: '',
    notes: '',
};

export default function AttentionTicketsIndex({
    tickets,
    filters,
    advisors,
    clients,
    projects,
    ticketTypes,
}: {
    tickets: { data: TicketItem[]; links: PaginationLink[]; current_page: number; last_page: number };
    filters: { status?: string; create?: string };
    advisors: Advisor[];
    clients: Client[];
    projects: Project[];
    ticketTypes: TicketType[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Operaciones', href: '/inmopro/attention-tickets' },
        { title: 'Tickets de atención', href: '/inmopro/attention-tickets' },
    ];
    const [createOpen, setCreateOpen] = useState(filters.create === '1');
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm(initialTicketForm);

    const statusLabels: Record<string, string> = {
        pendiente: 'Pendiente',
        agendado: 'Agendado',
        realizado: 'Realizado',
        cancelado: 'Cancelado',
    };

    const visibleClients = data.advisor_id
        ? clients.filter((client) => String(client.advisor_id) === data.advisor_id)
        : clients;

    const openCreateModal = () => {
        clearErrors();
        setCreateOpen(true);
    };

    const closeCreateModal = () => {
        setCreateOpen(false);
        reset();
        clearErrors();

        if (filters.create === '1') {
            router.get('/inmopro/attention-tickets', filters.status ? { status: filters.status } : {}, {
                preserveState: true,
                replace: true,
            });
        }
    };

    const submitCreateTicket = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/inmopro/attention-tickets', {
            preserveScroll: true,
            onSuccess: () => {
                closeCreateModal();
                showSuccessToast('Ticket creado correctamente');
            },
            onError: () => {
                setCreateOpen(true);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tickets de atención - Operaciones - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tickets de atención</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Solicitudes creadas por vendedor y agendadas desde administración.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/inmopro/attention-tickets/calendar">
                                <Calendar className="h-4 w-4" />
                                Ver calendario
                            </Link>
                        </Button>
                        <Button size="sm" type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" />
                            Nuevo ticket
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtrar por estado</CardTitle>
                        <CardDescription>Opcional.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={!filters.status ? 'secondary' : 'outline'} size="sm" onClick={() => router.get('/inmopro/attention-tickets')}>
                                Todos
                            </Button>
                            {['pendiente', 'agendado', 'realizado', 'cancelado'].map((status) => (
                                <Button
                                    key={status}
                                    variant={filters.status === status ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => router.get('/inmopro/attention-tickets', { status }, { preserveState: true })}
                                >
                                    {statusLabels[status] ?? status}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Listado</CardTitle>
                        <CardDescription>{tickets.data.length} ticket(s).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {tickets.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-slate-100 p-4">
                                    <Ticket className="h-10 w-10 text-slate-400" />
                                </div>
                                <p className="mt-4 font-medium text-slate-700">Sin tickets</p>
                                <p className="mt-1 text-sm text-slate-500">Cree una solicitud para iniciar el flujo de atención.</p>
                                <Button className="mt-4" variant="outline" type="button" onClick={openCreateModal}>
                                    Nuevo ticket
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Solicitud</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Agendado para</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Tipo</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Vendedor</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Proyecto</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">Lote legado</th>
                                                <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {tickets.data.map((ticket) => (
                                                <tr key={ticket.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 text-slate-700">{formatDateTime(ticket.created_at)}</td>
                                                    <td className="px-4 py-3 text-slate-700">{formatDateTime(ticket.scheduled_at)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                            {statusLabels[ticket.status] ?? ticket.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {ticket.type ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ticket.type.color ?? '#64748b' }} />
                                                                {ticket.type.name}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">{ticket.advisor?.name ?? '-'}</td>
                                                    <td className="px-4 py-3 text-slate-700">{ticket.client?.name ?? '-'}</td>
                                                    <td className="px-4 py-3 text-slate-700">{ticket.project?.name ?? '-'}</td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        {ticket.lot ? `${ticket.lot.block}-${ticket.lot.number}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                            <Link href={`/inmopro/attention-tickets/${ticket.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {tickets.data.length > 0 && (
                                    <div className="border-t border-slate-100 px-4 py-3">
                                        <Pagination links={tickets.links} />
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={createOpen} onOpenChange={(open) => {
                if (open) {
                    setCreateOpen(true);
                    return;
                }

                closeCreateModal();
            }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Nuevo ticket de atención</DialogTitle>
                        <DialogDescription>
                            Registra la solicitud por proyecto. El ticket inicia en pendiente y se agenda desde administración.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCreateTicket} className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-1">
                            <Label htmlFor="advisor_id">Vendedor</Label>
                            <select
                                id="advisor_id"
                                value={data.advisor_id}
                                onChange={(event) => {
                                    const nextAdvisorId = event.target.value;
                                    setData('advisor_id', nextAdvisorId);

                                    if (
                                        data.client_id &&
                                        !clients.some(
                                            (client) =>
                                                String(client.id) === data.client_id &&
                                                String(client.advisor_id) === nextAdvisorId,
                                        )
                                    ) {
                                        setData('client_id', '');
                                    }
                                }}
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Seleccione</option>
                                {advisors.map((advisor) => (
                                    <option key={advisor.id} value={advisor.id}>
                                        {advisor.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.advisor_id} />
                        </div>

                        <div className="md:col-span-1">
                            <Label htmlFor="client_id">Cliente</Label>
                            <select
                                id="client_id"
                                value={data.client_id}
                                onChange={(event) => setData('client_id', event.target.value)}
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Seleccione</option>
                                {visibleClients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                        {client.advisor?.name ? ` · ${client.advisor.name}` : ''}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.client_id} />
                        </div>

                        <div className="md:col-span-1">
                            <Label htmlFor="project_id">Proyecto</Label>
                            <select
                                id="project_id"
                                value={data.project_id}
                                onChange={(event) => setData('project_id', event.target.value)}
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Seleccione</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                        {project.location ? ` · ${project.location}` : ''}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.project_id} />
                        </div>

                        <div className="md:col-span-1">
                            <Label htmlFor="attention_ticket_type_id">Tipo de ticket</Label>
                            <select
                                id="attention_ticket_type_id"
                                value={data.attention_ticket_type_id}
                                onChange={(event) => setData('attention_ticket_type_id', event.target.value)}
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Seleccione</option>
                                {ticketTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.attention_ticket_type_id} />
                        </div>

                        <div className="md:col-span-2">
                            <Label htmlFor="notes">Observaciones</Label>
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                                className="mt-1 flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                rows={4}
                            />
                            <InputError message={errors.notes} />
                        </div>

                        <DialogFooter className="pt-2 md:col-span-2">
                            <Button type="button" variant="outline" onClick={closeCreateModal}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Crear ticket
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
