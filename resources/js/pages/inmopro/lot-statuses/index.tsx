import { Head, Link, router } from '@inertiajs/react';
import { Tag, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type LotStatus = { id: number; name: string; code: string; color?: string; sort_order?: number };

export default function LotStatusesIndex({ lotStatuses }: { lotStatuses: { data: LotStatus[]; links: PaginationLink[]; total?: number } }) {
    const items = lotStatuses.data;
    const totalStatuses = lotStatuses.total ?? items.length;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados de lote', href: '/inmopro/lot-statuses' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`¿Eliminar estado "${name}"?`)) {
            router.delete('/inmopro/lot-statuses/' + id);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Estados de lote - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Estados de lote</h2>
                        <p className="text-sm text-slate-500">Administrar estados para el inventario.</p>
                    </div>
                    <Link href="/inmopro/lot-statuses/create" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">
                        <Plus className="h-5 w-5" /> Nuevo
                    </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <AdminMetric label="Estados" value={String(totalStatuses)} />
                    <AdminMetric label="Codigos activos" value={items.map((status) => status.code).join(' / ')} tone="blue" />
                    <AdminMetric label="Uso" value="Inventario" tone="emerald" />
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Nombre</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Código</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Color</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{s.code}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block h-6 w-6 rounded border border-slate-200" style={{ backgroundColor: s.color || '#94a3b8' }} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link href={'/inmopro/lot-statuses/' + s.id} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></Link>
                                            <Link href={'/inmopro/lot-statuses/' + s.id + '/edit'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>
                                            <button type="button" onClick={() => handleDestroy(s.id, s.name)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Tag className="mx-auto mb-2 h-10 w-10" />
                            <p>No hay estados. <Link href="/inmopro/lot-statuses/create" className="text-emerald-600 hover:underline">Crear uno</Link></p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={lotStatuses.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function AdminMetric({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'blue' | 'emerald';
}) {
    const tones = {
        slate: 'text-slate-900',
        blue: 'text-blue-600',
        emerald: 'text-emerald-600',
    };

    return (
        <div className="rounded-3xl border border-border bg-card text-card-foreground p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`mt-3 text-xl font-black ${tones[tone]}`}>{value}</p>
        </div>
    );
}
