import { Head, Link } from '@inertiajs/react';
import { Megaphone, PlusCircle } from 'lucide-react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
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

            <div className="flex flex-col gap-6 p-6">
                <div className="flex justify-end">
                    <Button asChild>
                        <Link href="/crm/broadcasts/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nueva campaña
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Megaphone className="h-4 w-4" />
                            Campañas WhatsApp
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {broadcasts.data.length === 0 && (
                            <p className="text-sm text-muted-foreground">No hay campañas todavía.</p>
                        )}
                        {broadcasts.data.map((broadcast) => (
                            <div key={broadcast.id} className="rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium">{broadcast.name}</p>
                                    <Badge variant="outline">{broadcast.status}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {broadcast.sent_count}/{broadcast.total_recipients} enviados · {broadcast.read_count} leídos ·{' '}
                                    {broadcast.failed_count} fallidos
                                </p>
                            </div>
                        ))}
                        <Pagination links={broadcasts.links} />
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
