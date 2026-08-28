import { Head } from '@inertiajs/react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ConnectionRow = {
    id: number;
    status: string;
    connected_at: string | null;
    advisor: { id: number; name: string; email: string | null } | null;
    meta: { display_phone?: string; page_name?: string } | null;
};

type Props = {
    connections: { data: ConnectionRow[]; links: PaginationLink[] };
    stats: {
        active_connections: number;
        total_conversations: number;
        messages_today: number;
    };
    templates: { id: number; name: string; trigger_type: string; is_published: boolean }[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Meta Business', href: '/inmopro/meta' }];

export default function InmoproMetaIndex({ connections, stats, templates }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Meta Business" />

            <div className="flex flex-col gap-6 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Conexiones activas</CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold">{stats.active_connections}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Conversaciones</CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold">{stats.total_conversations}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Mensajes hoy</CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold">{stats.messages_today}</CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Conexiones por vendedor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {connections.data.map((connection) => (
                            <div key={connection.id} className="rounded-lg border p-3 text-sm">
                                <p className="font-medium">{connection.advisor?.name ?? '—'}</p>
                                <p className="text-muted-foreground">{connection.advisor?.email}</p>
                                <p className="mt-1">Estado: {connection.status}</p>
                            </div>
                        ))}
                        <Pagination links={connections.links} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
