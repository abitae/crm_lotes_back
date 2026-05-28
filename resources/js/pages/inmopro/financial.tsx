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
    advance?: string;
    remaining_balance?: string;
    contract_date?: string;
    client?: { name: string; dni: string };
    project?: { name: string; location: string };
};
type Project = { id: number; name: string };

export default function Financial({
    lots,
    projects,
    totalValue,
    totalCollected,
    totalPending,
    filters,
}: {
    lots: { data: Lot[]; links: PaginationLink[]; total: number };
    projects: Project[];
    totalValue: number;
    totalCollected: number;
    totalPending: number;
    filters: { project_id?: string; search?: string };
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
                            Seguimiento de ventas, cobranza y saldo pendiente por lote.
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
                    className="grid grid-cols-1 gap-3 rounded-3xl border border-border bg-card text-card-foreground p-4 shadow-sm sm:p-6 md:grid-cols-3"
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

                <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className={inmoproUi.sectionTitle}>Detalle de operaciones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className={inmoproUi.tableHead}>
                                <tr>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>Fecha / Lote</th>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>Cliente</th>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>Proyecto</th>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>Precio</th>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>Cobrado</th>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>Saldo</th>
                                    <th className={`px-6 py-3 ${inmoproUi.tableHeadCell}`}>% avance</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${inmoproUi.divide}`}>
                                {lots.data.map((lot) => {
                                    const price = Number(lot.price);
                                    const collected = Number(lot.advance ?? 0);
                                    const progress = price > 0 ? Math.round((collected / price) * 100) : 0;

                                    return (
                                        <tr key={lot.id} className={inmoproUi.tableRowHover}>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-slate-900">
                                                    {lot.block}-{lot.number}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {lot.contract_date ? formatDate(lot.contract_date) : 'Sin contrato'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800">
                                                    {lot.client?.name ?? 'Sin cliente'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    DNI: {lot.client?.dni ?? 'Sin DNI'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {lot.project?.name ?? 'Sin proyecto'}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-800">
                                                S/ {price.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-emerald-600">
                                                S/ {collected.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-amber-600">
                                                S/ {Number(lot.remaining_balance ?? 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                                    {progress}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {lots.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <Search className="mb-4 h-8 w-8 text-slate-300" />
                            <h4 className="font-black uppercase text-slate-800">Sin resultados</h4>
                            <p className="text-sm text-slate-400">
                                No se encontraron operaciones para los filtros aplicados.
                            </p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
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
