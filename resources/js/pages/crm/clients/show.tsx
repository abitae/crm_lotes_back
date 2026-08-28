import { Head, Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/crm/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import clients from '@/routes/crm/clients';
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Clientes', href: '/crm/clients' },
    { title: 'Detalle', href: '#' },
];

export default function CrmClientsShow({ client }: { client: ClientDetail }) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">{client.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {client.type?.name ?? 'Cliente'}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={clients.edit(client.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Link>
                    </Button>
                </div>

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
                                <span className="text-muted-foreground">Estado: </span>
                                {client.status ? (
                                    <StatusBadge color={client.status.color}>{client.status.name}</StatusBadge>
                                ) : (
                                    '—'
                                )}
                            </div>
                            <div>
                                <span className="text-muted-foreground">Etiquetas: </span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {client.tags.length === 0 && '—'}
                                    {client.tags.map((tag) => (
                                        <Badge key={tag.id} variant="secondary">
                                            {tag.name}
                                        </Badge>
                                    ))}
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
                            <p className="text-sm text-muted-foreground">
                                Este cliente no tiene lotes registrados.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border text-sm">
                                {client.lots.map((lot) => (
                                    <li key={lot.id} className="flex items-center justify-between py-2">
                                        <span>
                                            {lot.project?.name ?? 'Proyecto'} · Mz. {lot.block ?? '—'} Lt.{' '}
                                            {lot.number ?? '—'}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {lot.status?.name ?? '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
