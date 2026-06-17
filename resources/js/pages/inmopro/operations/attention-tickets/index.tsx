import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, Check, Eye, Plus, Search, Ticket, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';
import { showSuccessToast } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Project = { id: number; name: string; location?: string | null };
type Client = { id: number; name: string; dni?: string; advisor_id: number; advisor?: { id: number; name: string } | null };
type Advisor = { id: number; name: string };
type TicketType = { id: number; name: string; code: string; color?: string | null; allows_overlap: boolean };
type Lot = {
    id: number;
    block: string;
    number: string;
    price?: string | number | null;
    advance?: string | number | null;
    remaining_balance?: string | number | null;
} | null;
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

const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    agendado: 'Agendado',
    realizado: 'Realizado',
    cancelado: 'Cancelado',
};

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
}

function formatLotMoney(value?: string | number | null): string {
    if (value == null || value === '') {
        return '—';
    }

    return formatPen(Number(value));
}

function buildFilterQuery(filters: {
    status?: string;
    project_id?: string;
    advisor_id?: string;
}): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.project_id) {
        query.project_id = filters.project_id;
    }

    if (filters.advisor_id) {
        query.advisor_id = filters.advisor_id;
    }

    return query;
}

export default function AttentionTicketsIndex({
    tickets,
    filters,
    advisors,
    clients,
    projects,
    ticketTypes,
}: {
    tickets: { data: TicketItem[]; links: PaginationLink[]; current_page: number; last_page: number };
    filters: { status?: string; create?: string; project_id?: string; advisor_id?: string };
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
    const filterForm = useForm({
        status: filters.status ?? '',
        project_id: filters.project_id ?? '',
        advisor_id: filters.advisor_id ?? '',
    });
    const [createOpen, setCreateOpen] = useState(filters.create === '1');
    const [advisorFilterSearch, setAdvisorFilterSearch] = useState('');
    const [advisorFilterOpen, setAdvisorFilterOpen] = useState(false);
    const advisorFilterRef = useRef<HTMLDivElement>(null);
    const [createAdvisorSearch, setCreateAdvisorSearch] = useState('');
    const [createAdvisorOpen, setCreateAdvisorOpen] = useState(false);
    const createAdvisorRef = useRef<HTMLDivElement>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm(initialTicketForm);

    const selectedFilterAdvisor = advisors.find(
        (advisor) => String(advisor.id) === filterForm.data.advisor_id,
    );
    const selectedCreateAdvisor = advisors.find(
        (advisor) => String(advisor.id) === data.advisor_id,
    );

    const filteredFilterAdvisors = useMemo(() => {
        const search = normalizeSearch(advisorFilterSearch);

        if (!search) {
            return advisors;
        }

        return advisors.filter((advisor) => advisor.name.toLowerCase().includes(search));
    }, [advisorFilterSearch, advisors]);

    const filteredCreateAdvisors = useMemo(() => {
        const search = normalizeSearch(createAdvisorSearch);

        if (!search) {
            return advisors;
        }

        return advisors.filter((advisor) => advisor.name.toLowerCase().includes(search));
    }, [createAdvisorSearch, advisors]);

    const normalizedClientSearch = clientSearch.trim().toLowerCase();
    const normalizedProjectSearch = projectSearch.trim().toLowerCase();

    const visibleClients = (data.advisor_id
        ? clients.filter((client) => String(client.advisor_id) === data.advisor_id)
        : clients
    ).filter((client) => {
        const label = `${client.name} ${client.dni ?? ''} ${client.advisor?.name ?? ''}`;

        return label.toLowerCase().includes(normalizedClientSearch);
    });
    const visibleProjects = projects.filter((project) => {
        const label = `${project.name} ${project.location ?? ''}`;

        return label.toLowerCase().includes(normalizedProjectSearch);
    });

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get('/inmopro/attention-tickets', buildFilterQuery(filterForm.data), {
            preserveState: true,
        });
    };

    const applyStatusFilter = (status?: string) => {
        router.get(
            '/inmopro/attention-tickets',
            buildFilterQuery({
                status: status ?? '',
                project_id: filterForm.data.project_id,
                advisor_id: filterForm.data.advisor_id,
            }),
            { preserveState: true },
        );
    };

    const clearAdvisorFilter = () => {
        filterForm.setData('advisor_id', '');
        setAdvisorFilterSearch('');
        setAdvisorFilterOpen(false);
    };

    const selectAdvisorFilter = (advisorId: number) => {
        filterForm.setData('advisor_id', String(advisorId));
        setAdvisorFilterOpen(false);
    };

    const clearCreateAdvisor = () => {
        setData('advisor_id', '');
        setCreateAdvisorSearch('');
        setCreateAdvisorOpen(false);
    };

    const selectCreateAdvisor = (advisorId: number) => {
        const nextAdvisorId = String(advisorId);
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

        setCreateAdvisorOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                advisorFilterRef.current &&
                !advisorFilterRef.current.contains(event.target as Node)
            ) {
                setAdvisorFilterOpen(false);
            }

            if (
                createAdvisorRef.current &&
                !createAdvisorRef.current.contains(event.target as Node)
            ) {
                setCreateAdvisorOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openCreateModal = () => {
        clearErrors();
        setCreateOpen(true);
    };

    const closeCreateModal = () => {
        setCreateOpen(false);
        reset();
        setCreateAdvisorSearch('');
        setCreateAdvisorOpen(false);
        setClientSearch('');
        setProjectSearch('');
        clearErrors();

        if (filters.create === '1') {
            router.get('/inmopro/attention-tickets', buildFilterQuery(filterForm.data), {
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
            <div className="space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Tickets de atención</h1>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Solicitudes creadas por vendedor y agendadas desde administración.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none" asChild>
                            <Link href="/inmopro/attention-tickets/calendar">
                                <Calendar className="h-4 w-4" />
                                Ver calendario
                            </Link>
                        </Button>
                        <Button size="sm" type="button" className="h-9 flex-1 sm:flex-none" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" />
                            Nuevo ticket
                        </Button>
                    </div>
                </div>

                <form
                    onSubmit={submitFilters}
                    className="space-y-3 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm sm:p-4"
                >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select
                            value={filterForm.data.status}
                            onChange={(event) => filterForm.setData('status', event.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="">Todos los estados</option>
                            {Object.entries(statusLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterForm.data.project_id}
                            onChange={(event) => filterForm.setData('project_id', event.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="">Todos los proyectos</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        <div ref={advisorFilterRef} className="relative sm:col-span-2 lg:col-span-1">
                            <div className="flex gap-1">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={advisorFilterOpen ? advisorFilterSearch : (selectedFilterAdvisor?.name ?? advisorFilterSearch)}
                                        onChange={(event) => {
                                            setAdvisorFilterSearch(event.target.value);
                                            setAdvisorFilterOpen(true);
                                        }}
                                        onFocus={() => setAdvisorFilterOpen(true)}
                                        placeholder="Buscar asesor"
                                        className="h-9 bg-slate-50 pl-9 text-sm"
                                    />
                                </div>
                                {filterForm.data.advisor_id ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        onClick={clearAdvisorFilter}
                                        title="Quitar asesor"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                ) : null}
                            </div>
                            {advisorFilterOpen ? (
                                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {filteredFilterAdvisors.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
                                    ) : (
                                        filteredFilterAdvisors.map((advisor) => {
                                            const selected = filterForm.data.advisor_id === String(advisor.id);

                                            return (
                                                <button
                                                    key={advisor.id}
                                                    type="button"
                                                    onClick={() => selectAdvisorFilter(advisor.id)}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}
                                                >
                                                    <span className="truncate font-medium">{advisor.name}</span>
                                                    {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-1.5">
                            <Button
                                type="button"
                                variant={!filters.status ? 'secondary' : 'outline'}
                                size="sm"
                                className="h-8"
                                onClick={() => applyStatusFilter()}
                            >
                                Todos
                            </Button>
                            {Object.entries(statusLabels).map(([status, label]) => (
                                <Button
                                    key={status}
                                    type="button"
                                    variant={filters.status === status ? 'secondary' : 'outline'}
                                    size="sm"
                                    className="h-8"
                                    onClick={() => applyStatusFilter(status)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                        <Button type="submit" className="h-9 w-full sm:w-auto">
                            Filtrar
                        </Button>
                    </div>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
                    {tickets.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
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
                                <table className="w-full min-w-[980px] text-xs">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-2 py-2 text-left">Solicitud</th>
                                            <th className="px-2 py-2 text-left">Agenda</th>
                                            <th className="px-2 py-2 text-left">Estado</th>
                                            <th className="px-2 py-2 text-left">Tipo</th>
                                            <th className="px-2 py-2 text-left">Asesor</th>
                                            <th className="px-2 py-2 text-left">Cliente</th>
                                            <th className="px-2 py-2 text-left">Proyecto / Lote</th>
                                            <th className="px-2 py-2 text-right">Montos</th>
                                            <th className="px-2 py-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tickets.data.map((ticket) => (
                                            <tr key={ticket.id} className="align-top hover:bg-slate-50/60">
                                                <td className="px-2 py-1.5 text-slate-700">
                                                    {formatDateTime(ticket.created_at)}
                                                </td>
                                                <td className="px-2 py-1.5 text-slate-700">
                                                    {formatDateTime(ticket.scheduled_at)}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                                        {statusLabels[ticket.status] ?? ticket.status}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {ticket.type ? (
                                                        <span className="inline-flex max-w-[120px] items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                                            <span
                                                                className="h-2 w-2 shrink-0 rounded-full"
                                                                style={{ backgroundColor: ticket.type.color ?? '#64748b' }}
                                                            />
                                                            <span className="truncate">{ticket.type.name}</span>
                                                        </span>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="max-w-[100px] truncate px-2 py-1.5 text-slate-700">
                                                    {ticket.advisor?.name ?? '—'}
                                                </td>
                                                <td className="max-w-[110px] truncate px-2 py-1.5 text-slate-700">
                                                    {ticket.client?.name ?? '—'}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="max-w-[130px] truncate font-medium text-slate-800">
                                                        {ticket.project?.name ?? '—'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {ticket.lot ? `${ticket.lot.block}-${ticket.lot.number}` : 'Sin lote'}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {ticket.lot ? (
                                                        <>
                                                            <div className="text-slate-800">
                                                                {formatLotMoney(ticket.lot.price)}
                                                            </div>
                                                            <div className="text-[10px] text-emerald-700">
                                                                Sep. {formatLotMoney(ticket.lot.advance)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">
                                                                Rest. {formatLotMoney(ticket.lot.remaining_balance)}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 text-right">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                        <Link href={`/inmopro/attention-tickets/${ticket.id}`}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="border-t border-slate-100 px-3 py-2">
                                <Pagination links={tickets.links} />
                            </div>
                        </>
                    )}
                </div>
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
                        <div ref={createAdvisorRef} className="relative md:col-span-1">
                            <Label>Vendedor</Label>
                            <div className="mt-1 flex gap-1">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={createAdvisorOpen ? createAdvisorSearch : (selectedCreateAdvisor?.name ?? createAdvisorSearch)}
                                        onChange={(event) => {
                                            setCreateAdvisorSearch(event.target.value);
                                            setCreateAdvisorOpen(true);
                                        }}
                                        onFocus={() => setCreateAdvisorOpen(true)}
                                        placeholder="Buscar asesor"
                                        className="h-9 pl-9"
                                    />
                                </div>
                                {data.advisor_id ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        onClick={clearCreateAdvisor}
                                        title="Quitar asesor"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                ) : null}
                            </div>
                            {createAdvisorOpen ? (
                                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {filteredCreateAdvisors.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
                                    ) : (
                                        filteredCreateAdvisors.map((advisor) => {
                                            const selected = data.advisor_id === String(advisor.id);

                                            return (
                                                <button
                                                    key={advisor.id}
                                                    type="button"
                                                    onClick={() => selectCreateAdvisor(advisor.id)}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}
                                                >
                                                    <span className="truncate font-medium">{advisor.name}</span>
                                                    {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            ) : null}
                            <InputError message={errors.advisor_id} />
                        </div>

                        <div className="md:col-span-1">
                            <Label htmlFor="client_id">Cliente</Label>
                            <Input
                                value={clientSearch}
                                onChange={(event) => setClientSearch(event.target.value)}
                                placeholder="Buscar cliente"
                                className="mt-1 h-9"
                            />
                            <select
                                id="client_id"
                                value={data.client_id}
                                onChange={(event) => setData('client_id', event.target.value)}
                                className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                            <Input
                                value={projectSearch}
                                onChange={(event) => setProjectSearch(event.target.value)}
                                placeholder="Buscar proyecto"
                                className="mt-1 h-9"
                            />
                            <select
                                id="project_id"
                                value={data.project_id}
                                onChange={(event) => setData('project_id', event.target.value)}
                                className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Sin proyecto</option>
                                {visibleProjects.map((project) => (
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
                                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
