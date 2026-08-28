import type { EventClickArg } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Head, router, usePage } from '@inertiajs/react';
import { CalendarClock, PlusCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ReminderFormModal, type ReminderFormValues } from '@/components/crm/reminders/reminder-form-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import reminders from '@/routes/crm/reminders';
import type { Auth, BreadcrumbItem } from '@/types';

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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Agenda', href: '/crm/agenda' }];

export default function CrmAgendaIndex({ events, clients }: { events: CalendarEvent[]; clients: Option[] }) {
    const { google } = usePage<{ google: GoogleShared; auth: Auth }>().props;
    const [modalOpen, setModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<ReminderFormValues | null>(null);

    const openCreateModal = () => {
        setEditingReminder(null);
        setModalOpen(true);
    };

    const handleEventClick = (info: EventClickArg) => {
        info.jsEvent.preventDefault();
        const props = info.event.extendedProps as CalendarEvent['extendedProps'];

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

            <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Agenda</h1>
                        <p className="text-sm text-muted-foreground">
                            Recordatorios del CRM{google.calendar_connected ? ' sincronizados con Google Calendar' : ''}.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {google.calendar_connected && (
                            <Button variant="outline" onClick={syncCalendar}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sincronizar
                            </Button>
                        )}
                        <Button onClick={openCreateModal}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo recordatorio
                        </Button>
                    </div>
                </div>

                {!google.calendar_connected && google.connected && (
                    <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                            <span className="text-muted-foreground">
                                Conecta Google Calendar para sincronizar tus recordatorios en ambas direcciones.
                            </span>
                            <Button variant="secondary" size="sm" onClick={() => router.visit('/crm/google/calendar/connect')}>
                                Conectar Calendar
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="overflow-hidden">
                    <CardContent className="p-4">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <CalendarClock className="h-10 w-10 text-muted-foreground" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    No tienes recordatorios registrados todavía.
                                </p>
                            </div>
                        ) : (
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
                                eventClick={handleEventClick}
                                height="auto"
                                slotMinTime="07:00:00"
                                slotMaxTime="21:00:00"
                                allDaySlot={false}
                                nowIndicator
                                firstDay={1}
                                buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <ReminderFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                reminder={editingReminder}
                clients={clients}
                extraFooterAction={
                    editingReminder?.id
                        ? { label: 'Marcar como realizado', onClick: completeFromEvent }
                        : undefined
                }
            />
        </CrmLayout>
    );
}
