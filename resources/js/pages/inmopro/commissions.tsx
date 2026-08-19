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
    lot?: { block: string; number: string; project?: { name: string } };
    advisor?: { name: string; level?: { name: string } };
    status?: { code: string; name: string };
};
type FilterOption = { id: number; name: string };

export default function Commissions({
    commissions,
    totalCommissions,
    projects,
    teams,
    filters,
}: {
    commissions: { data: Commission[]; links: PaginationLink[] };
    totalCommissions: number;
    projects: FilterOption[];
    teams: FilterOption[];
    filters: { project_id?: string; team_id?: string; start_date?: string; end_date?: string; search?: string };
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
            project_id: (formData.get('project_id') as string) || undefined,
            team_id: (formData.get('team_id') as string) || undefined,
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
                    className="grid gap-3 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-2 xl:grid-cols-6"
                >
                    <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500">
                        Fecha desde
                        <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            name="start_date"
                            defaultValue={filters.start_date}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                        </div>
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500">
                        Fecha hasta
                        <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            name="end_date"
                            defaultValue={filters.end_date}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                        </div>
                    </label>
                    <select name="project_id" defaultValue={filters.project_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none">
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                    <select name="team_id" defaultValue={filters.team_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none">
                        <option value="">Todos los grupos</option>
                        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
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

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm sm:rounded-3xl">
                    <div className="border-b border-slate-100 px-3 py-2 sm:px-4">
                        <h2 className="text-sm font-black text-slate-900 sm:text-base">Liquidacion de comisiones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-2 py-2 text-left">Asesor</th>
                                    <th className="px-2 py-2 text-left">Lote</th>
                                    <th className="px-2 py-2 text-left">Tipo</th>
                                    <th className="px-2 py-2 text-right">%</th>
                                    <th className="px-2 py-2 text-right">Importe</th>
                                    <th className="px-2 py-2 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {commissions.data.map((commission) => (
                                    <tr key={commission.id} className="align-top hover:bg-slate-50/60">
                                        <td className="px-2 py-1.5">
                                            <p className="max-w-[120px] truncate font-semibold text-slate-900">
                                                {commission.advisor?.name ?? 'Sin asesor'}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {commission.date} · {commission.advisor?.level?.name ?? 'Sin nivel'}
                                            </p>
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <p className="font-medium text-slate-800">
                                                {commission.lot?.block}-{commission.lot?.number}
                                            </p>
                                            <p className="max-w-[110px] truncate text-[10px] text-slate-500">
                                                {commission.lot?.project?.name ?? 'Sin proyecto'}
                                            </p>
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    commission.type === 'DIRECTA'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {commission.type}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-700 tabular-nums">
                                            {commission.percentage}%
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-semibold text-emerald-600 tabular-nums">
                                            S/ {Number(commission.amount).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-1.5 text-right">
                                            {commission.status?.code === 'PENDIENTE' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void markAsPaid(commission)}
                                                    className="inline-flex items-center gap-1 rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span className="hidden sm:inline">Pagar</span>
                                                </button>
                                            ) : (
                                                <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
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
                        <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20">
                            <Percent className="mb-3 h-8 w-8 text-slate-300" />
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500 sm:text-sm">
                                No hay comisiones para este rango
                            </p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-3 py-2">
                            <Pagination links={commissions.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
