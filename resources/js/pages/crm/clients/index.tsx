import { Head, Link, router } from '@inertiajs/react';
import { LayoutGrid, Pencil, PlusCircle, Search, Table as TableIcon, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AttentionTicketFormModal } from '@/components/crm/attention-tickets/attention-ticket-form-modal';
import { ClientFormModal, type ClientFormValues } from '@/components/crm/clients/client-form-modal';
import { ClientTagToggles, toggleTagId } from '@/components/crm/clients/client-tag-toggles';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { CrmSegmentedControl } from '@/components/crm/crm-segmented';
import { EmptyState } from '@/components/crm/empty-state';
import { KanbanBoard } from '@/components/crm/kanban/kanban-board';
import type { KanbanClient } from '@/components/crm/kanban/kanban-card';
import { ReminderFormModal, type ReminderFormValues } from '@/components/crm/reminders/reminder-form-modal';
import { StatusBadge } from '@/components/crm/status-badge';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import CrmLayout from '@/layouts/crm/crm-layout';
import { crmSelectClass, crmTableCellClass, crmTableHeadClass, crmTableRowClass } from '@/lib/crm-ui';
import { confirmDelete } from '@/lib/swal';
import clients from '@/routes/crm/clients';
import clientsCrm from '@/routes/crm/clients/crm';
import type { BreadcrumbItem } from '@/types';

type ClientStatus = { id: number; code: string; name: string; color: string | null };
type ClientTag = { id: number; code: string; name: string; color: string | null };
type City = { id: number; name: string; department: string | null };
type Option = { id: number; name: string };

type ClientRow = KanbanClient;

type Props = {
    clients: {
        data: ClientRow[];
        links: PaginationLink[];
    };
    kanbanClients: KanbanClient[] | null;
    kanbanMeta: {
        shown: number;
        total: number;
        limit: number;
        counts: Record<string, number>;
    } | null;
    view: 'kanban' | 'table';
    statuses: ClientStatus[];
    tags: ClientTag[];
    cities: City[];
    projects: Option[];
    ticketTypes: Option[];
    perPageOptions: number[];
    filters: {
        search?: string;
        client_type?: string;
        client_status_id?: string;
        tag_ids?: number[] | string[];
        city_id?: string;
        created_from?: string;
        created_to?: string;
        per_page?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Clientes', href: '/crm/clients' }];
const SEARCH_DEBOUNCE_MS = 400;

export default function CrmClientsIndex({
    clients: paginated,
    kanbanClients,
    kanbanMeta,
    view,
    statuses,
    tags,
    cities,
    projects,
    ticketTypes,
    perPageOptions,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientFormValues | null>(null);
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [reminderPreset, setReminderPreset] = useState<ReminderFormValues | null>(null);
    const [ticketModalOpen, setTicketModalOpen] = useState(false);
    const [ticketPresetClientId, setTicketPresetClientId] = useState<number | null>(null);

    const isFirstRender = useRef(true);
    const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
    const selectedTagIds = (filters.tag_ids ?? [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);

    const navigate = (params: Record<string, unknown>) => {
        router.get(clients.index().url, { ...filters, view, ...params }, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        navigate({ search: debouncedSearch || undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const filterByStatus = (statusId: number | null) => {
        navigate({ client_status_id: statusId ?? undefined });
    };

    const setView = (nextView: 'kanban' | 'table') => {
        navigate({ view: nextView });
    };

    const handleFilterChange = (key: string, value: string) => {
        navigate({ [key]: value || undefined });
    };

    const clearFilters = () => {
        setSearch('');
        router.get(clients.index().url, { view }, { preserveState: true, replace: true });
    };

    const hasActiveFilters = Boolean(
        filters.search ||
            filters.client_type ||
            selectedTagIds.length > 0 ||
            filters.city_id ||
            filters.created_from ||
            filters.created_to,
    );

    const toggleFilterTag = (tagId: number) => {
        const next = toggleTagId(selectedTagIds, tagId);
        navigate({ tag_ids: next.length > 0 ? next : undefined });
    };

    const toggleClientTag = (client: KanbanClient, tagId: number) => {
        router.patch(
            clientsCrm.update(client.id).url,
            { tag_ids: toggleTagId(client.tags.map((tag) => tag.id), tagId) },
            { preserveScroll: true, preserveState: true },
        );
    };

    const openCreateModal = () => {
        setEditingClient(null);
        setClientModalOpen(true);
    };

    const openEditModal = (client: ClientRow) => {
        setEditingClient({
            id: client.id,
            name: client.name,
            dni: client.dni,
            phone: client.phone,
            email: client.email,
            referred_by: client.referred_by,
            city_id: client.city_id,
        });
        setClientModalOpen(true);
    };

    const openReminderModal = (client: KanbanClient) => {
        setReminderPreset({ client_id: client.id, title: '', notes: null, remind_at: '' });
        setReminderModalOpen(true);
    };

    const openTicketModal = (client: KanbanClient) => {
        setTicketPresetClientId(client.id);
        setTicketModalOpen(true);
    };

    const deleteClient = async (client: ClientRow) => {
        const confirmed = await confirmDelete('¿Eliminar cliente?', `Se eliminará a ${client.name}. Esta acción no se puede deshacer.`);

        if (confirmed) {
            router.delete(clients.destroy(client.id).url);
        }
    };

    const modalClientOptions = kanbanClients ?? paginated.data;
    const reminderClientOptions: Option[] = modalClientOptions.map((c) => ({ id: c.id, name: c.name }));
    const ticketClientOptions = modalClientOptions.map((c) => ({ id: c.id, name: c.name, dni: c.dni }));
    const kanbanCounts = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(kanbanMeta?.counts ?? {}).map(([key, value]) => [Number(key), value]),
            ),
        [kanbanMeta],
    );

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />

            <CrmPage>
                <CrmPageHeader
                    title="Clientes"
                    description="Kanban y listado de tu cartera. Arrastra para cambiar de etapa."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <CrmSegmentedControl
                                value={view}
                                onChange={setView}
                                options={[
                                    { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
                                    { value: 'table', label: 'Tabla', icon: TableIcon },
                                ]}
                            />
                            <Button onClick={openCreateModal}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nuevo cliente
                            </Button>
                        </div>
                    }
                />

                <div className="relative w-full max-w-sm">
                    <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="clients-search"
                        aria-label="Buscar clientes"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, DNI o teléfono"
                        className="pl-8"
                    />
                </div>

                {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Etiquetas</span>
                        <ClientTagToggles
                            tags={tags}
                            selectedIds={selectedTagIds}
                            onToggle={toggleFilterTag}
                        />
                    </div>
                )}

                {view === 'table' && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant={!filters.client_status_id ? 'default' : 'outline'}
                                onClick={() => filterByStatus(null)}
                            >
                                Todos
                            </Button>
                            {statuses.map((status) => (
                                <Button
                                    key={status.id}
                                    size="sm"
                                    variant={Number(filters.client_status_id) === status.id ? 'default' : 'outline'}
                                    onClick={() => filterByStatus(status.id)}
                                >
                                    <StatusBadge color={status.color}>{status.name}</StatusBadge>
                                </Button>
                            ))}
                        </div>

                        <Card>
                            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
                                <div>
                                    <Label htmlFor="filter-client-type" className="mb-1 block text-xs text-muted-foreground">
                                        Tipo
                                    </Label>
                                    <select
                                        id="filter-client-type"
                                        defaultValue={filters.client_type ?? ''}
                                        onChange={(e) => handleFilterChange('client_type', e.target.value)}
                                        className={crmSelectClass}
                                    >
                                        <option value="">Todos</option>
                                        <option value="PROPIO">Propio</option>
                                        <option value="DATERO">Referido de datero</option>
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="filter-city" className="mb-1 block text-xs text-muted-foreground">
                                        Ciudad
                                    </Label>
                                    <select
                                        id="filter-city"
                                        defaultValue={filters.city_id ?? ''}
                                        onChange={(e) => handleFilterChange('city_id', e.target.value)}
                                        className={crmSelectClass}
                                    >
                                        <option value="">Todas</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={city.id}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="filter-created-from" className="mb-1 block text-xs text-muted-foreground">
                                        Registrado desde
                                    </Label>
                                    <Input
                                        id="filter-created-from"
                                        type="date"
                                        defaultValue={filters.created_from ?? ''}
                                        onChange={(e) => handleFilterChange('created_from', e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="filter-created-to" className="mb-1 block text-xs text-muted-foreground">
                                        Registrado hasta
                                    </Label>
                                    <Input
                                        id="filter-created-to"
                                        type="date"
                                        defaultValue={filters.created_to ?? ''}
                                        onChange={(e) => handleFilterChange('created_to', e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="filter-per-page" className="mb-1 block text-xs text-muted-foreground">
                                        Por página
                                    </Label>
                                    <select
                                        id="filter-per-page"
                                        defaultValue={filters.per_page ?? ''}
                                        onChange={(e) => handleFilterChange('per_page', e.target.value)}
                                        className={crmSelectClass}
                                    >
                                        {perPageOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {hasActiveFilters && (
                                    <div className="flex items-end sm:col-span-2 lg:col-span-6">
                                        <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                                            <X className="mr-1.5 h-3.5 w-3.5" />
                                            Limpiar filtros
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {view === 'kanban' ? (
                    statuses.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="Crea tus estados de seguimiento"
                            description="Cada vendedor arma su propio kanban. Empieza creando estados."
                            action={
                                <Button size="sm" asChild>
                                    <Link href="/crm/pipeline">Estados y etiquetas</Link>
                                </Button>
                            }
                        />
                    ) : (
                    <>
                        <KanbanBoard
                            clients={kanbanClients ?? []}
                            statuses={statuses}
                            availableTags={tags}
                            counts={kanbanCounts}
                            onViewClient={(client) => router.visit(clients.show(client.id).url)}
                            onEditClient={openEditModal}
                            onCreateReminder={openReminderModal}
                            onCreateTicket={openTicketModal}
                            onToggleTag={toggleClientTag}
                        />
                    </>
                    )
                ) : (
                    <>
                        <Card>
                            <CardContent className="p-0">
                                {paginated.data.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="No se encontraron clientes"
                                        description={
                                            hasActiveFilters
                                                ? 'Prueba ajustando o limpiando los filtros aplicados.'
                                                : 'Registra tu primer cliente para empezar a darle seguimiento.'
                                        }
                                        action={
                                            !hasActiveFilters && (
                                                <Button size="sm" onClick={openCreateModal}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Nuevo cliente
                                                </Button>
                                            )
                                        }
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className={crmTableHeadClass}>
                                                <tr>
                                                    <th className={crmTableCellClass}>Nombre</th>
                                                    <th className={`hidden ${crmTableCellClass} sm:table-cell`}>DNI</th>
                                                    <th className={crmTableCellClass}>Teléfono</th>
                                                    <th className={crmTableCellClass}>Estado</th>
                                                    <th className={crmTableCellClass}>Etiquetas</th>
                                                    <th className={`hidden ${crmTableCellClass} md:table-cell`}>Tipo</th>
                                                    <th className={crmTableCellClass} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginated.data.map((client) => (
                                                    <tr key={client.id} className={crmTableRowClass}>
                                                        <td className={crmTableCellClass}>
                                                            <Link
                                                                href={clients.show(client.id)}
                                                                className="font-medium text-primary hover:underline"
                                                            >
                                                                {client.name}
                                                            </Link>
                                                        </td>
                                                        <td className={`hidden ${crmTableCellClass} sm:table-cell`}>{client.dni ?? '—'}</td>
                                                        <td className={crmTableCellClass}>{client.phone}</td>
                                                        <td className={crmTableCellClass}>
                                                            {client.status ? (
                                                                <StatusBadge color={client.status.color}>{client.status.name}</StatusBadge>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className={crmTableCellClass}>
                                                            <ClientTagToggles
                                                                tags={tags}
                                                                selectedIds={client.tags.map((tag) => tag.id)}
                                                                onToggle={(tagId) => toggleClientTag(client, tagId)}
                                                                size="sm"
                                                            />
                                                        </td>
                                                        <td className={`hidden ${crmTableCellClass} md:table-cell`}>{client.type?.name ?? '—'}</td>
                                                        <td className={`${crmTableCellClass} text-right`}>
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    aria-label={`Editar ${client.name}`}
                                                                    onClick={() => openEditModal(client)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    aria-label={`Eliminar ${client.name}`}
                                                                    onClick={() => deleteClient(client)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Pagination links={paginated.links} />
                    </>
                )}
            </CrmPage>

            <ClientFormModal
                open={clientModalOpen}
                onOpenChange={setClientModalOpen}
                client={editingClient}
                cities={cities}
            />

            <ReminderFormModal
                open={reminderModalOpen}
                onOpenChange={setReminderModalOpen}
                reminder={reminderPreset}
                clients={reminderClientOptions}
            />

            <AttentionTicketFormModal
                open={ticketModalOpen}
                onOpenChange={setTicketModalOpen}
                clients={ticketClientOptions}
                projects={projects}
                ticketTypes={ticketTypes}
                defaultClientId={ticketPresetClientId}
            />
        </CrmLayout>
    );
}
