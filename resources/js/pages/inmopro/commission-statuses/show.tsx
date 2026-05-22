import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type CommissionStatus = { id: number; name: string; code: string; color?: string; commissions_count?: number };

export default function CommissionStatusesShow({ commissionStatus }: { commissionStatus: CommissionStatus }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados de comision', href: '/inmopro/commission-statuses' },
        { title: commissionStatus.name, href: '/inmopro/commission-statuses/' + commissionStatus.id },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={commissionStatus.name + ' - Inmopro'} />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-lg border border-slate-200" style={{ backgroundColor: commissionStatus.color || '#94a3b8' }} />
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">{commissionStatus.name}</h2>
                            <p className="text-sm text-slate-500">Codigo: {commissionStatus.code}</p>
                        </div>
                    </div>
                    <Link href={'/inmopro/commission-statuses/' + commissionStatus.id + '/edit'} className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">Editar</Link>
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground p-4">
                    <p className="text-slate-600">Comisiones con este estado: <strong>{commissionStatus.commissions_count ?? 0}</strong></p>
                </div>
            </div>
        </AppLayout>
    );
}
