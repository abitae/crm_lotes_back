import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type LotStatus = { id: number; name: string; code: string; color?: string; sort_order?: number; lots_count?: number };

export default function LotStatusesShow({ lotStatus }: { lotStatus: LotStatus }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados de lote', href: '/inmopro/lot-statuses' },
        { title: lotStatus.name, href: `/inmopro/lot-statuses/${lotStatus.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${lotStatus.name} - Inmopro`} />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-lg border border-slate-200" style={{ backgroundColor: lotStatus.color ?? '#94a3b8' }} />
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">{lotStatus.name}</h2>
                            <p className="text-sm text-slate-500">Código: {lotStatus.code}</p>
                        </div>
                    </div>
                    <Link href={`/inmopro/lot-statuses/${lotStatus.id}/edit`} className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">Editar</Link>
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground p-4">
                    <p className="text-slate-600">Lotes con este estado: <strong>{lotStatus.lots_count ?? 0}</strong></p>
                </div>
            </div>
        </AppLayout>
    );
}
