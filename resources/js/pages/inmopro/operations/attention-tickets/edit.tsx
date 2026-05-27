import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { formatDateTime } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Ticket = {
    id: number;
    status: string;
    notes: string | null;
    scheduled_at: string | null;
    attention_ticket_type_id: number;
    type?: TicketType | null;
    client?: { name: string } | null;
    project?: { name: string } | null;
};

type TicketType = { id: number; name: string; code: string; color?: string | null; allows_overlap: boolean };

function toDateTimeLocal(value?: string | null): string {
    if (!value) {
        return '';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());

    return parsed.toISOString().slice(0, 16);
}

export default function AttentionTicketsEdit({ ticket, ticketTypes }: { ticket: Ticket; ticketTypes: TicketType[] }) {
    const { data, setData, put, processing, errors } = useForm({
        status: ticket.status,
        attention_ticket_type_id: String(ticket.attention_ticket_type_id),
        scheduled_at: toDateTimeLocal(ticket.scheduled_at),
        notes: ticket.notes ?? '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Operaciones', href: '/inmopro/attention-tickets' },
        { title: 'Tickets de atención', href: '/inmopro/attention-tickets' },
        { title: `Ticket #${ticket.id}`, href: `/inmopro/attention-tickets/${ticket.id}` },
        { title: 'Editar', href: `/inmopro/attention-tickets/${ticket.id}/edit` },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        put(`/inmopro/attention-tickets/${ticket.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ticket #${ticket.id} - Operaciones - Inmopro`} />
            <div className="p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar ticket #{ticket.id}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Agenda la atención y actualiza el seguimiento de la solicitud.
                    </p>
                </div>
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Gestión del ticket</CardTitle>
                        <CardDescription>
                            Cliente: {ticket.client?.name ?? '-'} · Proyecto: {ticket.project?.name ?? '-'} · Agendado: {formatDateTime(ticket.scheduled_at)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="status">Estado</Label>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(event) => setData('status', event.target.value)}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="agendado">Agendado</option>
                                    <option value="realizado">Realizado</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                                <InputError message={errors.status} />
                            </div>
                            <div>
                                <Label htmlFor="attention_ticket_type_id">Tipo de ticket</Label>
                                <select
                                    id="attention_ticket_type_id"
                                    value={data.attention_ticket_type_id}
                                    onChange={(event) => setData('attention_ticket_type_id', event.target.value)}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    required
                                >
                                    {ticketTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.attention_ticket_type_id} />
                            </div>
                            <div>
                                <Label htmlFor="scheduled_at">Fecha y hora programada</Label>
                                <Input
                                    id="scheduled_at"
                                    type="datetime-local"
                                    value={data.scheduled_at}
                                    onChange={(event) => setData('scheduled_at', event.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.scheduled_at} />
                            </div>
                            <div>
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
                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Guardar
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href={`/inmopro/attention-tickets/${ticket.id}`}>Cancelar</a>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
