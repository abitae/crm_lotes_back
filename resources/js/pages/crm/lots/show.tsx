import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { PreReservationFormModal } from '@/components/crm/pre-reservations/pre-reservation-form-modal';
import { StatusBadge } from '@/components/crm/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
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

type ClientOption = { id: number; name: string; dni: string | null };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proyectos', href: '/crm/projects' },
    { title: 'Lote', href: '#' },
];

export default function CrmLotsShow({ lot, clients }: { lot: LotDetail; clients: ClientOption[] }) {
    const [modalOpen, setModalOpen] = useState(false);

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
                                <StatusBadge color={lot.status.color}>{lot.status.name}</StatusBadge>
                            ) : (
                                '—'
                            )}
                        </p>

                        {lot.can_pre_reserve && lot.project && (
                            <Button className="mt-2" onClick={() => setModalOpen(true)}>
                                Registrar pre-reserva
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {lot.project && (
                <PreReservationFormModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    lot={{
                        id: lot.id,
                        block: lot.block,
                        number: lot.number,
                        price: lot.price,
                        project: lot.project,
                    }}
                    clients={clients}
                />
            )}
        </CrmLayout>
    );
}
