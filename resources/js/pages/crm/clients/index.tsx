import { Head, router } from '@inertiajs/react';
import { LayoutGrid, PlusCircle, Search, Table as TableIcon } from 'lucide-react';
import { useState } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { ClientFormModal, type ClientFormValues } from '@/components/crm/clients/client-form-modal';
import { KanbanBoard } from '@/components/crm/kanban/kanban-board';
import type { KanbanClient } from '@/components/crm/kanban/kanban-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CrmLayout from '@/layouts/crm/crm-layout';
import clients from '@/routes/crm/clients';
import type { BreadcrumbItem } from '@/types';

type ClientStatus = { id: number; code: string; name: string; color: string | null };
type ClientTag = { id: number; code: string; name: string; color: string | null };
type City = { id: number; name: string; department: string | null };

type ClientRow = KanbanClient;

type Props = {
    clients: {
        data: ClientRow[];
        links: PaginationLink[];
    };
    kanbanClients: KanbanClient[] | null;
    view: 'kanban' | 'table';
    statuses: ClientStatus[];
    tags: ClientTag[];
    cities: City[];
    filters: {
        search?: string;
        client_status_id?: string;
        tag_id?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Clientes', href: '/crm/clients' }];

export default function CrmClientsIndex({
    clients: paginated,
    kanbanClients,
    view,
    statuses,
    cities,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientFormValues | null>(null);

    const navigate = (params: Record<string, unknown>) => {
        router.get(clients.index().url, { ...filters, view, ...params }, { preserveState: true });
    };

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({ search: search || undefined });
    };

    const filterByStatus = (statusId: number | null) => {
        navigate({ client_status_id: statusId ?? undefined });
    };

    const setView = (nextView: 'kanban' | 'table') => {
        navigate({ view: nextView });
    };

    const openCreateModal = () => {
        setEditingClient(null);
        setModalOpen(true);
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
        setModalOpen(true);
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <form onSubmit={submitSearch} className="flex w-full max-w-sm items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, DNI o teléfono"
                                className="pl-8"
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Buscar
                        </Button>
                    </form>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-border p-0.5">
                            <Button
                                type="button"
                                size="sm"
                                variant={view === 'kanban' ? 'default' : 'ghost'}
                                onClick={() => setView('kanban')}
                                className="h-8"
                            >
                                <LayoutGrid className="mr-1.5 h-4 w-4" />
                                Kanban
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={view === 'table' ? 'default' : 'ghost'}
                                onClick={() => setView('table')}
                                className="h-8"
                            >
                                <TableIcon className="mr-1.5 h-4 w-4" />
                                Tabla
                            </Button>
                        </div>

                        <Button onClick={openCreateModal}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo cliente
                        </Button>
                    </div>
                </div>

                {view === 'table' && (
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
                                variant={
                                    Number(filters.client_status_id) === status.id ? 'default' : 'outline'
                                }
                                onClick={() => filterByStatus(status.id)}
                            >
                                <span
                                    className="mr-1.5 size-2 rounded-full"
                                    style={{ backgroundColor: status.color ?? '#94a3b8' }}
                                />
                                {status.name}
                            </Button>
                        ))}
                    </div>
                )}

                {view === 'kanban' ? (
                    <KanbanBoard
                        clients={kanbanClients ?? []}
                        statuses={statuses}
                        onEditClient={openEditModal}
                    />
                ) : (
                    <>
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-b border-border text-left text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Nombre</th>
                                                <th className="px-4 py-3 font-medium">DNI</th>
                                                <th className="px-4 py-3 font-medium">Teléfono</th>
                                                <th className="px-4 py-3 font-medium">Estado</th>
                                                <th className="px-4 py-3 font-medium">Tipo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginated.data.map((client) => (
                                                <tr
                                                    key={client.id}
                                                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                                                    onClick={() => openEditModal(client)}
                                                >
                                                    <td className="px-4 py-3 font-medium">{client.name}</td>
                                                    <td className="px-4 py-3">{client.dni ?? '—'}</td>
                                                    <td className="px-4 py-3">{client.phone}</td>
                                                    <td className="px-4 py-3">
                                                        {client.status ? (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <span
                                                                    className="size-2 rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            client.status.color ?? '#94a3b8',
                                                                    }}
                                                                />
                                                                {client.status.name}
                                                            </span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">{client.type?.name ?? '—'}</td>
                                                </tr>
                                            ))}
                                            {paginated.data.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-8 text-center text-muted-foreground"
                                                    >
                                                        No se encontraron clientes.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Pagination links={paginated.links} />
                    </>
                )}
            </div>

            <ClientFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                client={editingClient}
                cities={cities}
            />
        </CrmLayout>
    );
}
