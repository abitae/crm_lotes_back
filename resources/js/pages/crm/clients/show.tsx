import { Head, Link, router } from '@inertiajs/react';
import { LandPlot, Pencil } from 'lucide-react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { crmSelectClass } from '@/lib/crm-ui';
import clients from '@/routes/crm/clients';
import clientsCrm from '@/routes/crm/clients/crm';
import lots from '@/routes/crm/lots';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string | null;
    number: string | null;
    project: { name: string } | null;
    status: { code: string; name: string } | null;
};

type ClientDetail = {
    id: number;
    name: string;
    dni: string | null;
    phone: string;
    email: string | null;
    referred_by: string | null;
    type: { code: string; name: string } | null;
    status: { id: number; code: string; name: string; color: string | null } | null;
    tags: { id: number; name: string; color: string | null }[];
    city: { id: number; name: string; department: string | null } | null;
    lots: Lot[];
};

type CatalogOption = { id: number; code: string; name: string; color: string | null };

export default function CrmClientsShow({
    client,
    statuses,
    tags,
}: {
    client: ClientDetail;
    statuses: CatalogOption[];
    tags: CatalogOption[];
}) {
    const selectedTagIds = client.tags.map((tag) => tag.id);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clientes', href: '/crm/clients' },
        { title: client.name, href: `/crm/clients/${client.id}` },
    ];

    const updateCrm = (payload: Record<string, unknown>) => {
        router.patch(clientsCrm.update(client.id).url, payload, { preserveScroll: true });
    };

    const toggleTag = (tagId: number) => {
        const next = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter((id) => id !== tagId)
            : [...selectedTagIds, tagId];
        updateCrm({ tag_ids: next });
    };
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />

            <CrmPage>
                <CrmPageHeader
                    title={client.name}
                    description={client.type?.name ?? 'Cliente'}
                    actions={
                        <Button asChild variant="outline">
                            <Link href={clients.edit(client.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos de contacto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p>
                                <span className="text-muted-foreground">DNI: </span>
                                {client.dni ?? '—'}
                            </p>
                            <p>
                                <span className="text-muted-foreground">Teléfono: </span>
                                {client.phone}
                            </p>
                            <p>
                                <span className="text-muted-foreground">Email: </span>
                                {client.email ?? '—'}
                            </p>
                            <p>
                                <span className="text-muted-foreground">Ciudad: </span>
                                {client.city?.name ?? '—'}
                            </p>
                            <p>
                                <span className="text-muted-foreground">Referido por: </span>
                                {client.referred_by ?? '—'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Seguimiento CRM</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <label htmlFor="client-status" className="mb-1 block text-muted-foreground">
                                    Estado
                                </label>
                                <select
                                    id="client-status"
                                    value={client.status?.id ?? ''}
                                    onChange={(event) => {
                                        if (event.target.value) {
                                            updateCrm({ client_status_id: Number(event.target.value) });
                                        }
                                    }}
                                    className={crmSelectClass}
                                >
                                    <option value="">{client.status ? client.status.name : 'Sin estado'}</option>
                                    {statuses.map((status) => (
                                        <option key={status.id} value={status.id}>
                                            {status.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Etiquetas</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {tags.length === 0 && '—'}
                                    {tags.map((tag) => {
                                        const selected = selectedTagIds.includes(tag.id);

                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleTag(tag.id)}
                                            >
                                                <Badge variant={selected ? 'default' : 'secondary'}>
                                                    {tag.name}
                                                </Badge>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Lotes relacionados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {client.lots.length === 0 ? (
                            <EmptyState
                                icon={LandPlot}
                                title="Sin lotes relacionados"
                                description="Este cliente no tiene lotes registrados."
                                className="py-8"
                            />
                        ) : (
                            <ul className="divide-y divide-border text-sm">
                                {client.lots.map((lot) => (
                                    <li key={lot.id} className="flex items-center justify-between py-2">
                                        <Link href={lots.show(lot.id)} className="font-medium text-primary hover:underline">
                                            {lot.project?.name ?? 'Proyecto'} · Mz. {lot.block ?? '—'} Lt.{' '}
                                            {lot.number ?? '—'}
                                        </Link>
                                        {lot.status ? (
                                            <StatusBadge>{lot.status.name}</StatusBadge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </CrmPage>
        </CrmLayout>
    );
}
