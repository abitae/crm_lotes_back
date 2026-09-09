import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { PreReservationFormModal } from '@/components/crm/pre-reservations/pre-reservation-form-modal';
import { StatusBadge } from '@/components/crm/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatArea, formatMoney } from '@/lib/crm-format';
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

export default function CrmLotsShow({ lot }: { lot: LotDetail }) {
    const [modalOpen, setModalOpen] = useState(false);
    const title = `Mz. ${lot.block ?? '—'} Lt. ${lot.number ?? '—'}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Mis lotes', href: '/crm/my-lots' },
        { title, href: `/crm/lots/${lot.id}` },
    ];

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <CrmPage>
                <CrmPageHeader
                    title={title}
                    description={lot.project?.name ?? 'Lote'}
                    actions={
                        lot.can_pre_reserve && lot.project ? (
                            <Button onClick={() => setModalOpen(true)}>Registrar pre-reserva</Button>
                        ) : undefined
                    }
                />

                <Card className="max-w-xl">
                    <CardContent className="space-y-3 p-5 text-sm">
                        <p>
                            <span className="text-muted-foreground">Área: </span>
                            {formatArea(lot.area)}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Precio: </span>
                            {formatMoney(lot.price)}
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-muted-foreground">Estado:</span>
                            {lot.status ? (
                                <StatusBadge color={lot.status.color}>{lot.status.name}</StatusBadge>
                            ) : (
                                '—'
                            )}
                        </p>
                    </CardContent>
                </Card>
            </CrmPage>

            {lot.project && (
                <PreReservationFormModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    lot={{
                        id: lot.id,
                        block: lot.block,
                        number: lot.number,
                        area: lot.area,
                        price: lot.price,
                        project: lot.project,
                    }}
                />
            )}
        </CrmLayout>
    );
}
