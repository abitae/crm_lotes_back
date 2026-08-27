import { Head, Link, router } from '@inertiajs/react';
import { PlusCircle, Search } from 'lucide-react';
import { useState } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CrmLayout from '@/layouts/crm/crm-layout';
import clients from '@/routes/crm/clients';
import type { BreadcrumbItem } from '@/types';

type ClientStatus = { id: number; code: string; name: string; color: string | null };
type ClientTag = { id: number; code: string; name: string; color: string | null };

type ClientRow = {
    id: number;
    name: string;
    dni: string | null;
    phone: string;
    type: { code: string; name: string } | null;
    status: ClientStatus | null;
    tags: ClientTag[];
};

type Props = {
    clients: {
        data: ClientRow[];
        links: PaginationLink[];
    };
    statuses: ClientStatus[];
    tags: ClientTag[];
    filters: {
        search?: string;
        client_status_id?: string;
        tag_id?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Clientes', href: '/crm/clients' }];

export default function CrmClientsIndex({ clients: paginated, statuses, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(clients.index().url, { ...filters, search: search || undefined }, { preserveState: true });
    };

    const filterByStatus = (statusId: number | null) => {
        router.get(
            clients.index().url,
            { ...filters, client_status_id: statusId ?? undefined },
            { preserveState: true },
        );
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

                    <Button asChild>
                        <Link href={clients.create()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo cliente
                        </Link>
                    </Button>
                </div>

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
                                            onClick={() => router.visit(clients.show(client.id).url)}
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
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
            </div>
        </CrmLayout>
    );
}
