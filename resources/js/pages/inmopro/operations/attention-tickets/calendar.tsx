import { Head, Link, router } from '@inertiajs/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import allLocales from '@fullcalendar/core/locales-all';
import { List, Plus } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';

type CalendarEvent = {
    id: string;
    title: string;
    start: string;
    url?: string;
    extendedProps?: { status?: string; advisor?: string; project?: string; client?: string };
};

export default function AttentionTicketsCalendar({
    events,
    filters,
}: {
    events: CalendarEvent[];
    filters: { status?: string };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Operaciones', href: '/inmopro/attention-tickets' },
        { title: 'Tickets de atención', href: '/inmopro/attention-tickets' },
        { title: 'Calendario', href: '/inmopro/attention-tickets/calendar' },
    ];

    const statusLabels: Record<string, string> = {
        pendiente: 'Pendiente',
        agendado: 'Agendado',
        realizado: 'Realizado',
        cancelado: 'Cancelado',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Calendario - Tickets de atención - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendario de tickets</h1>
                        <p className="mt-1 text-sm text-slate-500">Vista de atenciones ya agendadas por proyecto.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/inmopro/attention-tickets">
                                <List className="h-4 w-4" />
                                Ver listado
                            </Link>
                        </Button>
                        <Button size="sm" asChild>
                            <Link href="/inmopro/attention-tickets?create=1">
                                <Plus className="h-4 w-4" />
                                Nuevo ticket
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtrar por estado</CardTitle>
                        <CardDescription>Opcional. Recarga el calendario.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={!filters.status ? 'secondary' : 'outline'} size="sm" onClick={() => router.get('/inmopro/attention-tickets/calendar')}>
                                Todos
                            </Button>
                            {['pendiente', 'agendado', 'realizado', 'cancelado'].map((status) => (
                                <Button
                                    key={status}
                                    variant={filters.status === status ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => router.get('/inmopro/attention-tickets/calendar', { status }, { preserveState: false })}
                                >
                                    {statusLabels[status] ?? status}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardContent className="p-4">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay',
                            }}
                            events={events}
                            locales={allLocales}
                            locale="es"
                            eventClick={(info) => {
                                if (info.event.url) {
                                    info.jsEvent.preventDefault();
                                    window.location.href = info.event.url;
                                }
                            }}
                            height="auto"
                            slotMinTime="07:00:00"
                            slotMaxTime="20:00:00"
                            allDaySlot={false}
                            nowIndicator
                            weekends
                            firstDay={1}
                            buttonText={{
                                today: 'Hoy',
                                month: 'Mes',
                                week: 'Semana',
                                day: 'Día',
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
