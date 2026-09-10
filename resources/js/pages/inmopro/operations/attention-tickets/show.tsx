import { Head, Link, router } from '@inertiajs/react';
import { Calendar, FileText, Pencil, PenLine, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/date';
import { formatClientPhone, useCanViewClientPhone } from '@/lib/inmopro-permissions';
import type { BreadcrumbItem } from '@/types';

type Project = { id: number; name: string; location?: string | null };
type Client = { id: number; name: string; dni?: string; phone?: string };
type Advisor = { id: number; name: string };
type TicketType = { id: number; name: string; code: string; color?: string | null; allows_overlap: boolean };
type Lot = { id: number; block: string; number: string; area?: string; price?: string } | null;
type DeliveryDeed = { id: number; printed_at: string | null; signed_at: string | null } | null;
type Ticket = {
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

export default function AttentionTicketsShow({ ticket }: { ticket: Ticket }) {
    const canViewPhone = useCanViewClientPhone();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Operaciones', href: '/inmopro/attention-tickets' },
        { title: 'Tickets de atención', href: '/inmopro/attention-tickets' },
        { title: `Ticket #${ticket.id}`, href: `/inmopro/attention-tickets/${ticket.id}` },
    ];

    const statusLabels: Record<string, string> = {
        pendiente: 'Pendiente',
        agendado: 'Agendado',
        realizado: 'Realizado',
        cancelado: 'Cancelado',
    };

    const canUseDeliveryDeed = ticket.lot !== null;
    const deed = ticket.delivery_deed;
    const isSigned = deed?.signed_at != null;

    const handlePrintDeed = () => {
        window.open(`/inmopro/attention-tickets/${ticket.id}/delivery-deed`, '_blank', 'noopener,noreferrer');
    };

    const handleMarkSigned = () => {
        router.post(`/inmopro/attention-tickets/${ticket.id}/delivery-deed/mark-signed`, {}, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ticket #${ticket.id} - Operaciones - Inmopro`} />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ticket #{ticket.id}</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Solicitud: {formatDateTime(ticket.created_at)}
                            {' · '}
                            Agendado: {formatDateTime(ticket.scheduled_at)}
                            {' · '}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {statusLabels[ticket.status] ?? ticket.status}
                            </span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/inmopro/attention-tickets/${ticket.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                        {canUseDeliveryDeed && (
                            <Button size="sm" onClick={handlePrintDeed}>
                                <FileText className="h-4 w-4" />
                                Imprimir acta
                            </Button>
                        )}
                        {canUseDeliveryDeed && !isSigned && (
                            <Button size="sm" variant="secondary" onClick={handleMarkSigned}>
                                <PenLine className="h-4 w-4" />
                                Registrar firma
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Proyecto solicitado
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p>
                                <span className="font-medium text-slate-600">Proyecto:</span> {ticket.project?.name ?? '-'}
                            </p>
                            {ticket.project?.location && (
                                <p>
                                    <span className="font-medium text-slate-600">Ubicación:</span> {ticket.project.location}
                                </p>
                            )}
                            {ticket.lot && (
                                <p>
                                    <span className="font-medium text-slate-600">Lote legado:</span> {ticket.lot.block}-{ticket.lot.number}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p>
                                <span className="font-medium text-slate-600">Nombre:</span> {ticket.client?.name ?? '-'}
                            </p>
                            {ticket.client?.dni && (
                                <p>
                                    <span className="font-medium text-slate-600">DNI:</span> {ticket.client.dni}
                                </p>
                            )}
                            <p>
                                <span className="font-medium text-slate-600">Teléfono:</span>{' '}
                                {formatClientPhone(ticket.client?.phone, canViewPhone)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Seguimiento</CardTitle>
                        <CardDescription>Estado de la solicitud, agenda y observaciones.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>
                            <span className="font-medium text-slate-600">Tipo:</span>{' '}
                            {ticket.type ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ticket.type.color ?? '#64748b' }} />
                                    {ticket.type.name}
                                </span>
                            ) : '-'}
                        </p>
                        <p>
                            <span className="font-medium text-slate-600">Vendedor:</span> {ticket.advisor?.name ?? '-'}
                        </p>
                        <p>
                            <span className="font-medium text-slate-600">Fecha solicitada:</span> {formatDateTime(ticket.created_at)}
                        </p>
                        <p>
                            <span className="font-medium text-slate-600">Fecha agendada:</span> {formatDateTime(ticket.scheduled_at)}
                        </p>
                        {deed?.printed_at && (
                            <p>
                                <span className="font-medium text-slate-600">Acta impresa:</span> {formatDateTime(deed.printed_at)}
                            </p>
                        )}
                        {deed?.signed_at && (
                            <p>
                                <span className="font-medium text-slate-600">Firma registrada:</span> {formatDateTime(deed.signed_at)}
                            </p>
                        )}
                        {ticket.notes && (
                            <p className="pt-2">
                                <span className="font-medium text-slate-600">Observaciones:</span> {ticket.notes}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
