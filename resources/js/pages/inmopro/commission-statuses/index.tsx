import { Head, Link, router } from '@inertiajs/react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type CommissionStatus = { id: number; name: string; code: string; color?: string };

export default function CommissionStatusesIndex({ commissionStatuses }: { commissionStatuses: { data: CommissionStatus[]; links: PaginationLink[]; total?: number } }) {
    const items = commissionStatuses.data;
    const totalStatuses = commissionStatuses.total ?? items.length;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados de comision', href: '/inmopro/commission-statuses' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`¿Eliminar estado "${name}"?`)) {
            router.delete('/inmopro/commission-statuses/' + id);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Estados de comision - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Estados de comision</h2>
                    </div>
                    <Link href="/inmopro/commission-statuses/create" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">
                        <Plus className="h-5 w-5" /> Nuevo
                    </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <CommissionMetric label="Estados" value={String(totalStatuses)} />
                    <CommissionMetric label="Ciclo" value="Pendiente / Pagado" tone="emerald" />
                    <CommissionMetric label="Uso" value="Liquidacion" tone="blue" />
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Nombre</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Codigo</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((s) => (
                                <tr key={s.id}>
                                    <td className="px-4 py-3 font-medium">{s.name}</td>
                                    <td className="px-4 py-3">{s.code}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link href={'/inmopro/commission-statuses/' + s.id}><Eye className="h-4 w-4" /></Link>
                                            <Link href={'/inmopro/commission-statuses/' + s.id + '/edit'}><Pencil className="h-4 w-4" /></Link>
                                            <button type="button" onClick={() => handleDestroy(s.id, s.name)}><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={commissionStatuses.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function CommissionMetric({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'emerald' | 'blue';
}) {
    const tones = {
        slate: 'text-slate-900',
        emerald: 'text-emerald-600',
        blue: 'text-blue-600',
    };

    return (
        <div className="rounded-3xl border border-border bg-card text-card-foreground p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`mt-3 text-xl font-black ${tones[tone]}`}>{value}</p>
        </div>
    );
}
