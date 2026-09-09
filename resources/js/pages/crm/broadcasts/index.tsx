import { Head, Link } from '@inertiajs/react';
import { Megaphone, PlusCircle } from 'lucide-react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { WorkflowBadge } from '@/components/crm/workflow-badge';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatDate } from '@/lib/crm-format';
import type { BreadcrumbItem } from '@/types';

type BroadcastRow = {
    id: number;
    name: string;
    status: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    failed_count: number;
    created_at: string;
};

type Props = {
    broadcasts: { data: BroadcastRow[]; links: PaginationLink[] };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Broadcasts', href: '/crm/broadcasts' }];

export default function CrmBroadcastsIndex({ broadcasts }: Props) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Broadcasts" />

            <CrmPage>
                <CrmPageHeader
                    title="Broadcasts"
                    description="Campañas masivas de WhatsApp para tu cartera."
                    actions={
                        <Button asChild>
                            <Link href="/crm/broadcasts/create">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nueva campaña
                            </Link>
                        </Button>
                    }
                />

                <Card>
                    <CardContent className="p-0">
                        {broadcasts.data.length === 0 ? (
                            <EmptyState
                                icon={Megaphone}
                                title="No hay campañas todavía"
                                description="Crea una campaña para enviar un mensaje a varios contactos."
                                action={
                                    <Button size="sm" asChild>
                                        <Link href="/crm/broadcasts/create">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Nueva campaña
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="divide-y divide-border">
                                {broadcasts.data.map((broadcast) => (
                                    <div key={broadcast.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">{broadcast.name}</p>
                                                <WorkflowBadge status={broadcast.status} />
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {broadcast.sent_count}/{broadcast.total_recipients} enviados · {broadcast.read_count} leídos ·{' '}
                                                {broadcast.failed_count} fallidos · {formatDate(broadcast.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Pagination links={broadcasts.links} />
            </CrmPage>
        </CrmLayout>
    );
}
