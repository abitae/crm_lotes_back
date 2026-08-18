import { Head, router, useForm } from '@inertiajs/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import allLocales from '@fullcalendar/core/locales-all';
import type { EventClickArg } from '@fullcalendar/core';
import { FormEvent, useEffect, useState } from 'react';
import { Calendar, Plus, Bell } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { BreadcrumbItem } from '@/types';

type Advisor = { id: number; name: string };
type Client = { id: number; name: string };
type CalendarEvent = {
    id: string;
    title: string;
    start: string;
    end?: string;
    url?: string;
    extendedProps?: {
        type: string;
        eventId?: number;
        reminderId?: number;
        client?: string;
        client_id?: number;
        title?: string;
        notes?: string | null;
        starts_at?: string;
        ends_at?: string | null;
        remind_at?: string;
    };
};
type PendingReminder = {
    id: number;
    client_id: number;
    title: string;
    notes?: string | null;
    remind_at: string;
    client?: { id: number; name: string };
};

type PageProps = {
    advisors: Advisor[];
    clients: Client[];
    events: CalendarEvent[];
    remindersPending: PendingReminder[];
    filters: {
        advisor_id?: string;
        start?: string;
        end?: string;
        event_id?: string;
    };
};

export default function AgendaIndex({
    advisors,
    clients,
    events,
    remindersPending,
    filters,
}: PageProps) {
    const advisorId = filters.advisor_id ?? '';
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [editEventData, setEditEventData] = useState<{
        id: number;
        client_id: number;
        title: string;
        notes: string;
        starts_at: string;
        ends_at: string;
    } | null>(null);
    const [editReminderData, setEditReminderData] = useState<{
        id: number;
        client_id: number;
        title: string;
        notes: string;
        remind_at: string;
    } | null>(null);

    useEffect(() => {
        if (filters.event_id) {
            const ev = events.find(
                (e) =>
                    e.extendedProps?.eventId === Number(filters.event_id) ||
                    e.extendedProps?.reminderId === Number(filters.event_id),
            );
            if (
                ev?.extendedProps?.type === 'event' &&
                ev.extendedProps?.eventId
            ) {
                setEditEventData({
                    id: ev.extendedProps.eventId,
                    client_id: ev.extendedProps.client_id ?? 0,
                    title: ev.extendedProps.title ?? ev.title,
                    notes: ev.extendedProps.notes ?? '',
                    starts_at: ev.extendedProps.starts_at
                        ? ev.extendedProps.starts_at.slice(0, 16)
                        : '',
                    ends_at: ev.extendedProps.ends_at
                        ? ev.extendedProps.ends_at.slice(0, 16)
                        : '',
                });
                setEventModalOpen(true);
            }
            if (
                ev?.extendedProps?.type === 'reminder' &&
                ev.extendedProps?.reminderId
            ) {
                setEditReminderData({
                    id: ev.extendedProps.reminderId,
                    client_id: ev.extendedProps.client_id ?? 0,
                    title: (ev.extendedProps.title ?? ev.title).replace(
                        /^⏰\s*/,
                        '',
                    ),
                    notes: ev.extendedProps.notes ?? '',
                    remind_at: ev.extendedProps.remind_at
                        ? ev.extendedProps.remind_at.slice(0, 16)
                        : '',
                });
                setReminderModalOpen(true);
            }
        }
    }, [filters.event_id, events]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Agenda', href: '/inmopro/agenda' },
    ];

    const handleAdvisorChange = (value: string) => {
        router.get(
            '/inmopro/agenda',
            { advisor_id: value || undefined },
            { preserveState: false },
        );
    };

    const handleDatesSet = (arg: { startStr: string; endStr: string }) => {
        if (!advisorId) return;
        router.get(
            '/inmopro/agenda',
            {
                advisor_id: advisorId,
                start: arg.startStr,
                end: arg.endStr,
            },
            { preserveState: true },
        );
    };

    const handleEventClick = (info: EventClickArg) => {
        info.jsEvent.preventDefault();
        const props = info.event
            .extendedProps as CalendarEvent['extendedProps'];
        if (!props) return;
        if (props.type === 'event' && props.eventId) {
            setEditEventData({
                id: props.eventId,
                client_id: props.client_id ?? 0,
                title: props.title ?? info.event.title ?? '',
                notes: props.notes ?? '',
                starts_at: props.starts_at ? props.starts_at.slice(0, 16) : '',
                ends_at: props.ends_at ? props.ends_at.slice(0, 16) : '',
            });
            setEventModalOpen(true);
        }
        if (props.type === 'reminder' && props.reminderId) {
            setEditReminderData({
                id: props.reminderId,
                client_id: props.client_id ?? 0,
                title: (props.title ?? info.event.title ?? '').replace(
                    /^⏰\s*/,
                    '',
                ),
                notes: props.notes ?? '',
                remind_at: props.remind_at ? props.remind_at.slice(0, 16) : '',
            });
            setReminderModalOpen(true);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agenda - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Agenda por vendedor
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Eventos y recordatorios ligados a clientes.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Vendedor</CardTitle>
                        <CardDescription>
                            Seleccione un vendedor para ver su agenda y
                            recordatorios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <select
                            value={advisorId}
                            onChange={(e) =>
                                handleAdvisorChange(e.target.value)
                            }
                            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
                        >
                            <option value="">— Seleccione vendedor —</option>
                            {advisors.map((a) => (
                                <option key={a.id} value={String(a.id)}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>

                {!advisorId ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Calendar className="h-12 w-12 text-slate-300" />
                            <p className="mt-4 text-slate-500">
                                Seleccione un vendedor para ver el calendario.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    setEditEventData(null);
                                    setEventModalOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo evento
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditReminderData(null);
                                    setReminderModalOpen(true);
                                }}
                            >
                                <Bell className="h-4 w-4" />
                                Nuevo recordatorio
                            </Button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <Card className="overflow-hidden">
                                    <CardContent className="p-4">
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
                                            datesSet={handleDatesSet}
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
                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Bell className="h-5 w-5" />
                                            Recordatorios pendientes
                                        </CardTitle>
                                        <CardDescription>
                                            Hoy o vencidos, sin completar.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {remindersPending.length === 0 ? (
                                            <p className="text-sm text-slate-500">
                                                No hay recordatorios pendientes.
                                            </p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {remindersPending.map((r) => (
                                                    <li
                                                        key={r.id}
                                                        className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-2 text-sm"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-slate-800">
                                                                {r.title}
                                                            </p>
                                                            <p className="text-slate-500">
                                                                {r.client
                                                                    ?.name ??
                                                                    ''}{' '}
                                                                ·{' '}
                                                                {new Date(
                                                                    r.remind_at,
                                                                ).toLocaleString(
                                                                    'es-PE',
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditReminderData(
                                                                        {
                                                                            id: r.id,
                                                                            client_id:
                                                                                r.client_id,
                                                                            title: r.title,
                                                                            notes:
                                                                                r.notes ??
                                                                                '',
                                                                            remind_at:
                                                                                r.remind_at.slice(
                                                                                    0,
                                                                                    16,
                                                                                ),
                                                                        },
                                                                    );
                                                                    setReminderModalOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                            >
                                                                Editar
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/inmopro/advisor-reminders/${r.id}/complete`,
                                                                    )
                                                                }
                                                            >
                                                                Realizado
                                                            </Button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}

                {advisorId && (
                    <>
                        <EventModal
                            open={eventModalOpen}
                            onOpenChange={setEventModalOpen}
                            advisorId={Number(advisorId)}
                            clients={clients}
                            editData={editEventData}
                            onClose={() => setEditEventData(null)}
                        />
                        <ReminderModal
                            open={reminderModalOpen}
                            onOpenChange={setReminderModalOpen}
                            advisorId={Number(advisorId)}
                            clients={clients}
                            editData={editReminderData}
                            onClose={() => setEditReminderData(null)}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function EventModal({
    open,
    onOpenChange,
    advisorId,
    clients,
    editData,
    onClose,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisorId: number;
    clients: Client[];
    editData: {
        id: number;
        client_id: number;
        title: string;
        notes: string;
        starts_at: string;
        ends_at: string;
    } | null;
    onClose: () => void;
}) {
    const isEdit = editData !== null;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        advisor_id: advisorId,
        client_id: editData?.client_id ?? clients[0]?.id ?? 0,
        title: editData?.title ?? '',
        notes: editData?.notes ?? '',
        starts_at: editData?.starts_at ?? '',
        ends_at: editData?.ends_at ?? '',
    });

    useEffect(() => {
        if (open && editData) {
            setData({
                advisor_id: advisorId,
                client_id: editData.client_id,
                title: editData.title,
                notes: editData.notes,
                starts_at: editData.starts_at,
                ends_at: editData.ends_at,
            });
        }
        if (open && !editData) {
            const now = new Date();
            const end = new Date(now.getTime() + 60 * 60 * 1000);
            setData({
                advisor_id: advisorId,
                client_id: clients[0]?.id ?? 0,
                title: '',
                notes: '',
                starts_at: now.toISOString().slice(0, 16),
                ends_at: end.toISOString().slice(0, 16),
            });
        }
    }, [open, editData, advisorId, clients]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(`/inmopro/advisor-agenda-events/${editData.id}`, {
                onSuccess: () => {
                    onOpenChange(false);
                    onClose();
                },
            });
        } else {
            post('/inmopro/advisor-agenda-events', {
                onSuccess: () => {
                    onOpenChange(false);
                    onClose();
                },
            });
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                onOpenChange(v);
                if (!v) onClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Editar evento' : 'Nuevo evento'}
                    </DialogTitle>
                    <DialogDescription>
                        Evento de agenda ligado a un cliente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label>Cliente</Label>
                        <select
                            value={data.client_id}
                            onChange={(e) =>
                                setData('client_id', Number(e.target.value))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                        >
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.client_id} />
                    </div>
                    <div>
                        <Label>Título</Label>
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.title} />
                    </div>
                    <div>
                        <Label>Notas</Label>
                        <Input
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.notes} />
                    </div>
                    <div>
                        <Label>Inicio</Label>
                        <Input
                            type="datetime-local"
                            value={data.starts_at}
                            onChange={(e) =>
                                setData('starts_at', e.target.value)
                            }
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.starts_at} />
                    </div>
                    <div>
                        <Label>Fin (opcional)</Label>
                        <Input
                            type="datetime-local"
                            value={data.ends_at}
                            onChange={(e) => setData('ends_at', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.ends_at} />
                    </div>
                    <DialogFooter className="flex-wrap gap-2">
                        {isEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                    if (
                                        window.confirm('¿Eliminar este evento?')
                                    ) {
                                        router.delete(
                                            `/inmopro/advisor-agenda-events/${editData.id}`,
                                            {
                                                onSuccess: () =>
                                                    onOpenChange(false),
                                            },
                                        );
                                    }
                                }}
                            >
                                Eliminar
                            </Button>
                        )}
                        <div className="flex flex-1 justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {isEdit ? 'Guardar' : 'Crear'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ReminderModal({
    open,
    onOpenChange,
    advisorId,
    clients,
    editData,
    onClose,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisorId: number;
    clients: Client[];
    editData: {
        id: number;
        client_id: number;
        title: string;
        notes: string;
        remind_at: string;
    } | null;
    onClose: () => void;
}) {
    const isEdit = editData !== null;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        advisor_id: advisorId,
        client_id: editData?.client_id ?? clients[0]?.id ?? 0,
        title: editData?.title ?? '',
        notes: editData?.notes ?? '',
        remind_at: editData?.remind_at ?? '',
    });

    useEffect(() => {
        if (open && editData) {
            setData({
                advisor_id: advisorId,
                client_id: editData.client_id,
                title: editData.title,
                notes: editData.notes,
                remind_at: editData.remind_at,
            });
        }
        if (open && !editData) {
            const now = new Date();
            setData({
                advisor_id: advisorId,
                client_id: clients[0]?.id ?? 0,
                title: '',
                notes: '',
                remind_at: now.toISOString().slice(0, 16),
            });
        }
    }, [open, editData, advisorId, clients]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(`/inmopro/advisor-reminders/${editData.id}`, {
                onSuccess: () => {
                    onOpenChange(false);
                    onClose();
                },
            });
        } else {
            post('/inmopro/advisor-reminders', {
                onSuccess: () => {
                    onOpenChange(false);
                    onClose();
                },
            });
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                onOpenChange(v);
                if (!v) onClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Editar recordatorio' : 'Nuevo recordatorio'}
                    </DialogTitle>
                    <DialogDescription>
                        Recordatorio puntual ligado a un cliente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label>Cliente</Label>
                        <select
                            value={data.client_id}
                            onChange={(e) =>
                                setData('client_id', Number(e.target.value))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                        >
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.client_id} />
                    </div>
                    <div>
                        <Label>Título</Label>
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.title} />
                    </div>
                    <div>
                        <Label>Notas</Label>
                        <Input
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.notes} />
                    </div>
                    <div>
                        <Label>Fecha y hora</Label>
                        <Input
                            type="datetime-local"
                            value={data.remind_at}
                            onChange={(e) =>
                                setData('remind_at', e.target.value)
                            }
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.remind_at} />
                    </div>
                    <DialogFooter className="flex-wrap gap-2">
                        {isEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            '¿Eliminar este recordatorio?',
                                        )
                                    ) {
                                        router.delete(
                                            `/inmopro/advisor-reminders/${editData.id}`,
                                            {
                                                onSuccess: () =>
                                                    onOpenChange(false),
                                            },
                                        );
                                    }
                                }}
                            >
                                Eliminar
                            </Button>
                        )}
                        <div className="flex flex-1 justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {isEdit ? 'Guardar' : 'Crear'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
