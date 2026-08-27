import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import preReservations from '@/routes/crm/lots/pre-reservations';
import type { BreadcrumbItem } from '@/types';

type LotDetail = {
    id: number;
    block: string | null;
    number: string | null;
    area: number | string | null;
    price: number | string | null;
    project: { id: number; name: string } | null;
    status: { code: string; name: string; color: string | null } | null;
    can_pre_reserve: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proyectos', href: '/crm/projects' },
    { title: 'Lote', href: '#' },
];

export default function CrmLotsShow({ lot }: { lot: LotDetail }) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lote ${lot.number ?? lot.id}`} />

            <div className="p-6">
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>
                            {lot.project?.name} · Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>
                            <span className="text-muted-foreground">Área: </span>
                            {lot.area ?? '—'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Precio: </span>
                            {lot.price ?? '—'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Estado: </span>
                            {lot.status ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ backgroundColor: lot.status.color ?? '#94a3b8' }}
                                    />
                                    {lot.status.name}
                                </span>
                            ) : (
                                '—'
                            )}
                        </p>

                        {lot.can_pre_reserve && (
                            <Button asChild className="mt-2">
                                <Link href={preReservations.create(lot.id)}>Registrar pre-reserva</Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
