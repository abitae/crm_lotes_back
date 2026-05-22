import { Head, router } from '@inertiajs/react';
import { Calendar, CheckCircle2, DollarSign, Percent, Search } from 'lucide-react';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import Pagination, { type PaginationLink } from '@/components/pagination';
import AppLayout from '@/layouts/app-layout';
import { confirmCommissionMarkPaid } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Commission = {
    id: number;
    amount: string;
    percentage: string;
    type: string;
    date: string;
    lot?: { block: string; number: number; project?: { name: string } };
    advisor?: { name: string; level?: { name: string } };
    status?: { code: string; name: string };
};

export default function Commissions({
    commissions,
    totalCommissions,
    filters,
}: {
    commissions: { data: Commission[]; links: PaginationLink[] };
    totalCommissions: number;
    filters: { start_date?: string; end_date?: string; search?: string };
}) {
    const pendingCount = commissions.data.filter((commission) => commission.status?.code === 'PENDIENTE').length;
    const paidCount = commissions.data.filter((commission) => commission.status?.code === 'PAGADO').length;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Comisiones', href: '/inmopro/commissions' },
    ];

    const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get('/inmopro/commissions', {
            start_date: (formData.get('start_date') as string) || undefined,
            end_date: (formData.get('end_date') as string) || undefined,
            search: (formData.get('search') as string) || undefined,
        });
    };

    const markAsPaid = async (commission: Commission) => {
        const advisorName = commission.advisor?.name ?? 'Sin asesor';
        const amountLabel = `S/ ${Number(commission.amount).toLocaleString()}`;
        const lotLabel = `${commission.lot?.block ?? '—'}-${commission.lot?.number ?? '—'}`;
        const projectName = commission.lot?.project?.name ?? 'Sin proyecto';

        const confirmed = await confirmCommissionMarkPaid({
            advisorName,
            amountLabel,
            lotLabel,
            projectName,
        });

        if (!confirmed) {
            return;
        }

        router.post(`/inmopro/commissions/${commission.id}/mark-as-paid`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Comisiones - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Comisiones</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Liquidacion de comisiones directas y piramidales por lote transferido.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <InmoproMetricCard icon={DollarSign} label="Total comisiones" value={`S/ ${totalCommissions.toLocaleString()}`} tone="emerald" />
                    <InmoproMetricCard icon={Percent} label="Pendientes" value={String(pendingCount)} tone="amber" />
                    <InmoproMetricCard icon={CheckCircle2} label="Pagadas" value={String(paidCount)} tone="slate" />
                </div>

                <form
                    onSubmit={handleFilter}
                    className="grid gap-3 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-4"
                >
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            name="start_date"
                            defaultValue={filters.start_date}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            name="end_date"
                            defaultValue={filters.end_date}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            name="search"
                            placeholder="Buscar vendedor"
                            defaultValue={filters.search}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Filtrar
                    </button>
                </form>

                <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-lg font-black text-slate-900">Liquidacion de comisiones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500">Fecha / Asesor</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Lote / Proyecto</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Tipo</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">% aplicado</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Importe</th>
                                    <th className="px-6 py-3 text-right font-bold text-slate-500">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {commissions.data.map((commission) => (
                                    <tr key={commission.id} className="hover:bg-slate-50/60">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-900">{commission.advisor?.name ?? 'Sin asesor'}</p>
                                            <p className="text-xs text-slate-500">
                                                {commission.date} · {commission.advisor?.level?.name ?? 'Sin nivel'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <p className="font-semibold text-slate-800">
                                                {commission.lot?.block}-{commission.lot?.number}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {commission.lot?.project?.name ?? 'Sin proyecto'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                                    commission.type === 'DIRECTA'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {commission.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                            {commission.percentage}%
                                        </td>
                                        <td className="px-6 py-4 font-black text-emerald-600">
                                            S/ {Number(commission.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {commission.status?.code === 'PENDIENTE' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void markAsPaid(commission)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase text-amber-700"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Marcar pagado
                                                </button>
                                            ) : (
                                                <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-black uppercase text-emerald-700">
                                                    Pagado
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {commissions.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <Percent className="mb-4 h-10 w-10 text-slate-300" />
                            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                                No hay comisiones para este rango
                            </p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={commissions.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

