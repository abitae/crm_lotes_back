import type { EventClickArg } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    ExternalLink,
    PlusCircle,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import {
    ReminderFormModal,
    type ReminderFormValues,
} from '@/components/crm/reminders/reminder-form-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { startOauthRedirect } from '@/lib/utils';
import type { Auth, BreadcrumbItem } from '@/types';
import reminders from '@/routes/crm/reminders';

type Option = { id: number; name: string };

type GoogleShared = {
    connected: boolean;
    calendar_connected: boolean;
};

type CalendarEvent = {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        reminderId: number;
        clientId: number | null;
        client: string | null;
        title: string;
        notes: string | null;
        remindAt: string;
        completed: boolean;
        source?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Agenda', href: '/crm/agenda' },
];

export default function CrmAgendaIndex({
    events,
    clients,
}: {
    events: CalendarEvent[];
    clients: Option[];
}) {
    const { google } = usePage<{ google: GoogleShared; auth: Auth }>().props;
    const [modalOpen, setModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] =
        useState<ReminderFormValues | null>(null);

    const openCreateModal = () => {
        setEditingReminder(null);
        setModalOpen(true);
    };

    const handleEventClick = (info: EventClickArg) => {
        info.jsEvent.preventDefault();
        const props = info.event
            .extendedProps as CalendarEvent['extendedProps'];

        setEditingReminder({
            id: props.reminderId,
            client_id: props.clientId,
            title: props.title,
            notes: props.notes,
            remind_at: props.remindAt,
        });
        setModalOpen(true);
    };

    const completeFromEvent = () => {
        if (editingReminder?.id) {
            router.post(reminders.complete(editingReminder.id).url);
            setModalOpen(false);
        }
    };

    const syncCalendar = () => {
        router.post('/crm/google/calendar/sync');
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Agenda" />

            <CrmPage className="gap-4">
                <CrmPageHeader
                    title="Agenda"
                    description={
                        google.calendar_connected
                            ? 'Vista del CRM, sincronizada con Google Calendar.'
                            : 'Vista semanal de tus recordatorios.'
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            {google.calendar_connected && (
                                <>
                                    <Button variant="outline" asChild>
                                        <a
                                            href="https://calendar.google.com/calendar/r"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Abrir en Google Calendar
                                        </a>
                                    </Button>
                                    <Button variant="outline" onClick={syncCalendar}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Sincronizar
                                    </Button>
                                </>
                            )}
                            <Button onClick={openCreateModal}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nuevo recordatorio
                            </Button>
                        </div>
                    }
                />

                {!google.calendar_connected && (
                    <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                            <span className="text-muted-foreground">
                                Conecta Google Calendar para sincronizar tus
                                recordatorios en ambas direcciones.
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    startOauthRedirect(
                                        '/crm/google/calendar/connect',
                                    )
                                }
                            >
                                Conectar Calendar
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="overflow-hidden">
                    <CardContent className="p-4">
                        {events.length === 0 ? (
                            <EmptyState
                                icon={CalendarClock}
                                className="py-8"
                                title="Sin recordatorios todavía"
                                description="El calendario queda listo. Crea un recordatorio para verlo aquí."
                            />
                        ) : null}
                        <div className={events.length === 0 ? 'mt-2' : undefined}>
                            <FullCalendar
                                plugins={[
                                    dayGridPlugin,
                                    timeGridPlugin,
                                    interactionPlugin,
                                ]}
                                initialView="timeGridWeek"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                                }}
                                events={events}
                                locales={allLocales}
                                locale="es"
                                eventClick={handleEventClick}
                                height="auto"
                                slotMinTime="07:00:00"
                                slotMaxTime="21:00:00"
                                allDaySlot={false}
                                nowIndicator
                                firstDay={1}
                                buttonText={{
                                    today: 'Hoy',
                                    month: 'Mes',
                                    week: 'Semana',
                                    day: 'Día',
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </CrmPage>

            <ReminderFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                reminder={editingReminder}
                clients={clients}
                extraFooterAction={
                    editingReminder?.id
                        ? {
                              label: 'Marcar como realizado',
                              onClick: completeFromEvent,
                          }
                        : undefined
                }
            />
        </CrmLayout>
    );
}
