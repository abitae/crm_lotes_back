import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, Building2, DollarSign, Search, WalletCards } from 'lucide-react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/date';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import { inmoproUi } from '@/lib/inmopro-ui';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string;
    number: string;
    price: string;
    sale_price?: string | null;
    advance?: string;
    remaining_balance?: string;
    contract_date?: string;
    client?: { name: string; dni: string };
    project?: { name: string; location: string };
    financial_metrics: { list_price: number; sale_price: number | null; acquisition_cost: number | null; expenses_total: number; commissions_total: number; net_profit: number | null; profit_margin: number | null };
};
type Project = { id: number; name: string };
type Team = { id: number; name: string };

export default function Financial({
    lots,
    projects,
    teams,
    totalValue,
    totalCollected,
    totalPending,
    totalExpenses,
    totalCommissions,
    filters,
}: {
    lots: { data: Lot[]; links: PaginationLink[]; total: number };
    projects: Project[];
    teams: Team[];
    totalValue: number;
    totalCollected: number;
    totalPending: number;
    totalExpenses: number;
    totalCommissions: number;
    filters: { project_id?: string; team_id?: string; start_date?: string; end_date?: string; search?: string };
}) {
    const collectionRate = totalValue > 0 ? Math.round((totalCollected / totalValue) * 100) : 0;
    const pendingRate = totalValue > 0 ? Math.round((totalPending / totalValue) * 100) : 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control Financiero', href: '/inmopro/financial' },
    ];

    const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get('/inmopro/financial', {
            project_id: (formData.get('project_id') as string) || undefined,
            team_id: (formData.get('team_id') as string) || undefined,
            start_date: (formData.get('start_date') as string) || undefined,
            end_date: (formData.get('end_date') as string) || undefined,
            search: (formData.get('search') as string) || undefined,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Control Financiero - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className={inmoproUi.pageTitle}>Control financiero</h1>
                        <p className={inmoproUi.pageSubtitle}>
                            Seguimiento de ventas, costos, gastos, ganancias y cobranza por lote.
                        </p>
                    </div>
                    <Link
                        href="/inmopro/accounts-receivable"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                    >
                        <WalletCards className="h-4 w-4" />
                        Abrir cuentas por cobrar
                    </Link>
                </div>

                <section className="space-y-4" aria-label="Resumen financiero">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <InmoproMetricCard icon={Building2} label="Portafolio" value={`S/ ${totalValue.toLocaleString()}`} tone="blue" />
                        <InmoproMetricCard icon={DollarSign} label="Cobrado" value={`S/ ${totalCollected.toLocaleString()}`} tone="emerald" />
                        <InmoproMetricCard icon={AlertTriangle} label="Pendiente" value={`S/ ${totalPending.toLocaleString()}`} tone="amber" />
                        <InmoproMetricCard icon={WalletCards} label="Operaciones" value={String(lots.total)} tone="slate" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InmoproMetricCard icon={AlertTriangle} label="Gastos" value={`S/ ${totalExpenses.toLocaleString()}`} tone="amber" />
                        <InmoproMetricCard icon={WalletCards} label="Comisiones" value={`S/ ${totalCommissions.toLocaleString()}`} tone="slate" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ProgressCard
                            title="Avance de cobranza"
                            description={`${collectionRate}% del portafolio visible ya fue cobrado.`}
                            value={collectionRate}
                            tone="emerald"
                        />
                        <ProgressCard
                            title="Riesgo de cartera"
                            description={`${pendingRate}% del portafolio visible sigue pendiente.`}
                            value={pendingRate}
                            tone="amber"
                        />
                    </div>
                </section>

                <form
                    onSubmit={handleFilter}
                    className="grid grid-cols-1 gap-3 rounded-3xl border border-border bg-card text-card-foreground p-4 shadow-sm sm:p-6 md:grid-cols-2 xl:grid-cols-6"
                >
                    <select
                        name="project_id"
                        defaultValue={filters.project_id}
                        className={inmoproUi.input}
                    >
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <select name="team_id" defaultValue={filters.team_id} className={inmoproUi.input}>
                        <option value="">Todos los grupos</option>
                        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                    <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500">
                        Fecha desde
                        <input type="date" name="start_date" defaultValue={filters.start_date} className={inmoproUi.input} />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500">
                        Fecha hasta
                        <input type="date" name="end_date" defaultValue={filters.end_date} className={inmoproUi.input} />
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            name="search"
                            placeholder="Cliente o DNI"
                            defaultValue={filters.search}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                        Filtrar
                    </button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm sm:rounded-3xl">
                    <div className="border-b border-slate-100 px-3 py-2 sm:px-4">
                        <h2 className="text-sm font-black text-slate-900 sm:text-base">Detalle de operaciones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-2 py-2 text-left">Lote</th>
                                    <th className="px-2 py-2 text-left">Cliente</th>
                                    <th className="px-2 py-2 text-left">Proyecto</th>
                                    <th className="px-2 py-2 text-right">Montos</th>
                                    <th className="px-2 py-2 text-right">Avance</th>
                                    <th className="px-2 py-2 text-right">Resultado</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${inmoproUi.divide}`}>
                                {lots.data.map((lot) => {
                                    const price = Number(lot.sale_price ?? lot.price);
                                    const collected = Number(lot.advance ?? 0);
                                    const progress = price > 0 ? Math.round((collected / price) * 100) : 0;

                                    return (
                                        <tr key={lot.id} className={`align-top ${inmoproUi.tableRowHover}`}>
                                            <td className="px-2 py-1.5">
                                                <p className="font-semibold text-slate-900">
                                                    <Link href={`/inmopro/lots/${lot.id}`} className="hover:text-emerald-700 hover:underline">{lot.block}-{lot.number}</Link>
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    {lot.contract_date ? formatDate(lot.contract_date) : 'Sin contrato'}
                                                </p>
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <p className="max-w-[120px] truncate font-medium text-slate-800">
                                                    {lot.client?.name ?? 'Sin cliente'}
                                                </p>
                                                <p className="truncate text-[10px] text-slate-500">
                                                    {lot.client?.dni ?? 'Sin DNI'}
                                                </p>
                                            </td>
                                            <td className="max-w-[110px] truncate px-2 py-1.5 text-slate-600">
                                                {lot.project?.name ?? 'Sin proyecto'}
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums">
                                                <div className="text-slate-800">S/ {price.toLocaleString()}</div>
                                                <div className="text-[10px] text-emerald-700">Cob. S/ {collected.toLocaleString()}</div>
                                                <div className="text-[10px] text-amber-600">
                                                    Sal. S/ {Number(lot.remaining_balance ?? 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5 text-right">
                                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                    {progress}%
                                                </span>
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums">
                                                {lot.financial_metrics.net_profit === null ? (
                                                    <span className="text-[10px] text-amber-700">Costo base pendiente</span>
                                                ) : (
                                                    <><div className="font-semibold text-emerald-700">S/ {lot.financial_metrics.net_profit.toLocaleString()}</div><div className="text-[10px] text-slate-500">{lot.financial_metrics.profit_margin}% margen</div></>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {lots.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center sm:p-16">
                            <Search className="mb-3 h-7 w-7 text-slate-300" />
                            <h4 className="text-sm font-black uppercase text-slate-800">Sin resultados</h4>
                            <p className="text-xs text-slate-400">
                                No se encontraron operaciones para los filtros aplicados.
                            </p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-3 py-2">
                            <Pagination links={lots.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function ProgressCard({
    title,
    description,
    value,
    tone,
}: {
    title: string;
    description: string;
    value: number;
    tone: 'emerald' | 'amber';
}) {
    const barTone = tone === 'emerald' ? 'from-emerald-600 to-emerald-400' : 'from-amber-500 to-amber-300';

    return (
        <div className={`${inmoproUi.metricCard} sm:p-6`}>
            <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black uppercase tracking-wide text-foreground">{title}</h3>
                <span className="shrink-0 text-lg font-black text-foreground">{value}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${barTone}`}
                    style={{ width: `${Math.min(100, value)}%` }}
                />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
