import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarCheck,
    CheckCircle2,
    Pencil,
    PlusCircle,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ClientSearchSelect } from '@/components/crm/clients/client-search-select';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { CrmSegmentedControl } from '@/components/crm/crm-segmented';
import { EmptyState } from '@/components/crm/empty-state';
import {
    ReminderFormModal,
    type ReminderFormValues,
} from '@/components/crm/reminders/reminder-form-modal';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import CrmLayout from '@/layouts/crm/crm-layout';
import { confirmDelete } from '@/lib/swal';
import { startOauthRedirect } from '@/lib/utils';
import type { Auth, BreadcrumbItem } from '@/types';
import reminders from '@/routes/crm/reminders';

type ReminderRow = {
    id: number;
    title: string;
    notes: string | null;
    remind_at: string;
    completed_at: string | null;
    client: { id: number; name: string } | null;
    client_id: number | null;
    google_event_id: string | null;
    source: string | null;
};

type ClientOption = { id: number; name: string };

type Period = 'pendientes' | 'hoy' | 'proximos' | 'pasados';

type Filters = {
    period?: string;
    search?: string;
    client_id?: string;
};

type GoogleShared = {
    connected: boolean;
    calendar_connected: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Recordatorios', href: '/crm/reminders' },
];
const SEARCH_DEBOUNCE_MS = 400;

const PERIODS: { id: Period; label: string }[] = [
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'hoy', label: 'Hoy' },
    { id: 'proximos', label: 'Próximos' },
    { id: 'pasados', label: 'Pasados' },
];

function formatRemindAt(value: string, period: Period): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    if (period === 'hoy') {
        return date.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function emptyCopy(period: Period): { title: string; description: string } {
    if (period === 'pasados') {
        return {
            title: 'No hay recordatorios pasados',
            description:
                'Los vencidos y los de días anteriores aparecerán aquí.',
        };
    }

    if (period === 'proximos') {
        return {
            title: 'No hay recordatorios próximos',
            description: 'Los de mañana en adelante aparecerán en esta lista.',
        };
    }

    if (period === 'pendientes') {
        return {
            title: 'No hay recordatorios pendientes',
            description:
                'Aquí ves los no completados, incluidos los vencidos y los de otros días. Es el mismo universo que el KPI del dashboard.',
        };
    }

    return {
        title: 'No tienes recordatorios para hoy',
        description:
            'Crea un recordatorio para no perder el seguimiento de un cliente.',
    };
}

function reminderState(reminder: ReminderRow): {
    label: string;
    className: string;
} {
    if (reminder.completed_at) {
        return {
            label: 'Completado',
            className: 'bg-muted text-muted-foreground',
        };
    }

    if (new Date(reminder.remind_at).getTime() < Date.now()) {
        return {
            label: 'Vencido',
            className: 'bg-destructive/10 text-destructive',
        };
    }

    return {
        label: 'Pendiente',
        className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    };
}

export default function CrmRemindersIndex({
    reminders: remindersPage,
    clients,
    filters,
}: {
    reminders: { data: ReminderRow[]; links: PaginationLink[] };
    clients: ClientOption[];
    filters: Filters;
}) {
    const { google } = usePage<{ google: GoogleShared; auth: Auth }>().props;
    const period = (
        PERIODS.some((item) => item.id === filters.period)
            ? filters.period
            : 'hoy'
    ) as Period;
    const reminderList = remindersPage.data;
    const [search, setSearch] = useState(filters.search ?? '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] =
        useState<ReminderFormValues | null>(null);
    const isFirstRender = useRef(true);
    const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
    const clientId = filters.client_id ? Number(filters.client_id) : '';
    const hasExtraFilters = Boolean(filters.search || filters.client_id);

    const navigate = (params: Record<string, unknown>) => {
        router.get(
            reminders.index().url,
            { ...filters, ...params },
            { preserveState: true, replace: true },
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const nextSearch = debouncedSearch.trim();

        if ((filters.search ?? '') === nextSearch) {
            return;
        }

        navigate({ search: nextSearch || undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const openCreateModal = () => {
        setEditingReminder(null);
        setModalOpen(true);
    };

    const openEditModal = (reminder: ReminderRow) => {
        setEditingReminder({
            id: reminder.id,
            client_id: reminder.client_id,
            title: reminder.title,
            notes: reminder.notes,
            remind_at: reminder.remind_at,
        });
        setModalOpen(true);
    };

    const complete = (id: number) => router.post(reminders.complete(id).url);
    const remove = async (id: number) => {
        const confirmed = await confirmDelete('¿Eliminar este recordatorio?');

        if (confirmed) {
            router.delete(reminders.destroy(id).url);
        }
    };

    const empty = emptyCopy(period);

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Recordatorios" />

            <CrmPage className="gap-4">
                <CrmPageHeader
                    title="Recordatorios"
                    description="Pendientes no completados, el día de hoy, próximos y pasados."
                    actions={
                        <Button onClick={openCreateModal}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo recordatorio
                        </Button>
                    }
                />

                <CrmSegmentedControl
                    value={period}
                    onChange={(next) => navigate({ period: next })}
                    options={PERIODS.map((item) => ({ value: item.id, label: item.label }))}
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="reminders-search"
                            aria-label="Buscar recordatorios"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por título, notas o cliente"
                            className="pl-8"
                        />
                    </div>
                    <ClientSearchSelect
                        id="reminders-client"
                        remote
                        clients={clients}
                        value={clientId}
                        onChange={(next) =>
                            navigate({ client_id: next || undefined })
                        }
                        allowEmpty
                        emptyLabel="Todos los clientes"
                        placeholder="Buscar por nombre, DNI o teléfono…"
                    />
                    {hasExtraFilters && (
                        <div className="flex items-center">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setSearch('');
                                    router.get(
                                        reminders.index().url,
                                        { period },
                                        { preserveState: true, replace: true },
                                    );
                                }}
                            >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Limpiar filtros
                            </Button>
                        </div>
                    )}
                </div>

                <Card className="gap-0 py-0">
                    <CardContent className="divide-y divide-border p-0">
                        {reminderList.length === 0 && (
                            <EmptyState
                                icon={Bell}
                                title={empty.title}
                                description={empty.description}
                                action={
                                    <Button size="sm" onClick={openCreateModal}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Nuevo recordatorio
                                    </Button>
                                }
                            />
                        )}
                        {reminderList.map((reminder) => {
                            const completed = reminder.completed_at !== null;
                            const state = reminderState(reminder);

                            return (
                                <div
                                    key={reminder.id}
                                    className={`flex items-center gap-3 px-4 py-2 ${completed ? 'opacity-60' : ''}`}
                                >
                                    <time
                                        dateTime={reminder.remind_at}
                                        className="w-24 shrink-0 text-xs font-medium text-muted-foreground tabular-nums"
                                    >
                                        {formatRemindAt(
                                            reminder.remind_at,
                                            period,
                                        )}
                                    </time>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate text-sm font-medium ${completed ? 'line-through' : ''}`}
                                        >
                                            {reminder.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {reminder.client?.name ??
                                                'Sin cliente'}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${state.className}`}
                                    >
                                        {state.label}
                                    </span>
                                    {reminder.google_event_id && (
                                        <span title="Sincronizado con Google Calendar">
                                            <CalendarCheck
                                                className="size-4 shrink-0 text-muted-foreground"
                                                aria-label="Sincronizado con Google Calendar"
                                            />
                                        </span>
                                    )}
                                    <div className="flex shrink-0 gap-0.5">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-7"
                                            aria-label={`Editar recordatorio: ${reminder.title}`}
                                            onClick={() =>
                                                openEditModal(reminder)
                                            }
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {!completed && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="size-7"
                                                aria-label={`Completar recordatorio: ${reminder.title}`}
                                                onClick={() =>
                                                    complete(reminder.id)
                                                }
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-7"
                                            aria-label={`Eliminar recordatorio: ${reminder.title}`}
                                            onClick={() => remove(reminder.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Pagination links={remindersPage.links} />
            </CrmPage>

            <ReminderFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                reminder={editingReminder}
                clients={clients}
            />
        </CrmLayout>
    );
}
