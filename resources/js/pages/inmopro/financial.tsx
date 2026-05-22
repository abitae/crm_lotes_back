import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, Building2, Calendar, DollarSign, Search, WalletCards } from 'lucide-react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string;
    number: number;
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
    filters: { project_id?: string; start_date: string; end_date: string; search?: string };
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
            start_date: (formData.get('start_date') as string) || filters.start_date,
            end_date: (formData.get('end_date') as string) || filters.end_date,
            search: (formData.get('search') as string) || undefined,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Control Financiero - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            Control financiero
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Seguimiento de ventas, cobranza y saldo pendiente por lote. Por defecto se muestra el mes en curso.
                        </p>
                    </div>
                    <Link
                        href="/inmopro/accounts-receivable"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                    >
                        <WalletCards className="h-4 w-4" />
                        Abrir cuentas por cobrar
                    </Link>
                </div>

                <form
                    onSubmit={handleFilter}
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-5"
                >
                    <select
                        name="project_id"
                        defaultValue={filters.project_id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                    >
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <div className="relative">
                        <label htmlFor="financial-start-date" className="sr-only">
                            Desde
                        </label>
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            id="financial-start-date"
                            type="date"
                            name="start_date"
                            required
                            defaultValue={filters.start_date}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <label htmlFor="financial-end-date" className="sr-only">
                            Hasta
                        </label>
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            id="financial-end-date"
                            type="date"
                            name="end_date"
                            required
                            defaultValue={filters.end_date}
                            min={filters.start_date}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
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
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                        Filtrar
                    </button>
                </form>

                <div className="grid gap-4 xl:grid-cols-4">
                    <MetricCard icon={Building2} label="Portafolio" value={`S/ ${totalValue.toLocaleString()}`} tone="blue" />
                    <MetricCard icon={DollarSign} label="Cobrado" value={`S/ ${totalCollected.toLocaleString()}`} tone="emerald" />
                    <MetricCard icon={AlertTriangle} label="Pendiente" value={`S/ ${totalPending.toLocaleString()}`} tone="amber" />
                    <MetricCard icon={WalletCards} label="Operaciones" value={String(lots.total)} tone="slate" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
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

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-lg font-black text-slate-900">Detalle de operaciones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500">Fecha / Lote</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Cliente</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Proyecto</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Precio</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Cobrado</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Saldo</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">% avance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lots.data.map((lot) => {
                                    const price = Number(lot.price);
                                    const collected = Number(lot.advance ?? 0);
                                    const progress = price > 0 ? Math.round((collected / price) * 100) : 0;

                                    return (
                                        <tr key={lot.id} className="hover:bg-slate-50/60">
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

function MetricCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof DollarSign;
    label: string;
    value: string;
    tone: 'slate' | 'blue' | 'emerald' | 'amber';
}) {
    const tones = {
        slate: 'bg-slate-50 text-slate-700',
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
    };

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <div className={`rounded-2xl p-3 ${tones[tone]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{value}</p>
        </div>
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">{title}</h3>
                <span className="text-lg font-black text-slate-900">{value}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${barTone}`}
                    style={{ width: `${Math.min(100, value)}%` }}
                />
            </div>
            <p className="mt-3 text-sm text-slate-500">{description}</p>
        </div>
    );
}
