import { Head, router } from '@inertiajs/react';
import type { ComponentType, FormEvent } from 'react';
import { useMemo } from 'react';
import {
    BarChart3,
    CalendarRange,
    FileSpreadsheet,
    FileDown,
    FolderKanban,
    Target,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Bar as StackedBar,
    BarChart as StackedBarChart,
    CartesianGrid as StackedCartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AppLayout from '@/layouts/app-layout';
import { inmoproMetricTone } from '@/lib/inmopro-ui';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

const penFormatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatPen(value: number): string {
    return penFormatter.format(value);
}

function toYmdLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
}

type Project = { id: number; name: string };
type Team = { id: number; name: string; color?: string | null };
type Advisor = { id: number; name: string; team?: Team | null };
type ReportRow = {
    id: number;
    label: string;
    sold_amount: number;
    goal_amount: number;
    collected_amount: number;
    pending_amount: number;
    lots_count: number;
    pct: number;
    color?: string | null;
    team_name?: string | null;
};
type Filters = {
    view: 'projects' | 'teams' | 'advisors';
    project_id?: number | null;
    team_id?: number | null;
    advisor_id?: number | null;
    start_date?: string | null;
    end_date?: string | null;
};
type Summary = {
    sold_amount: number;
    goal_amount: number;
    collected_amount: number;
    pending_amount: number;
    lots_count: number;
    entities_count: number;
    pct: number;
    rows_goal_sum: number;
    avg_sale_per_lot: number;
    collection_pct: number;
};
type FilterLabels = {
    project?: string | null;
    team?: string | null;
    advisor?: string | null;
    start_date?: string | null;
    end_date?: string | null;
};

function entityColumnLabel(v: Filters['view']): string {
    if (v === 'teams') {
        return 'Equipo';
    }
    if (v === 'advisors') {
        return 'Vendedor';
    }

    return 'Proyecto';
}

function buildExportQueryString(
    view: Filters['view'],
    filters: Filters,
    disposition?: 'inline' | 'attachment',
): string {
    const params = new URLSearchParams();
    params.set('view', view);
    if (filters.project_id) {
        params.set('project_id', String(filters.project_id));
    }
    if (filters.team_id) {
        params.set('team_id', String(filters.team_id));
    }
    if (filters.advisor_id) {
        params.set('advisor_id', String(filters.advisor_id));
    }
    if (filters.start_date) {
        params.set('start_date', filters.start_date);
    }
    if (filters.end_date) {
        params.set('end_date', filters.end_date);
    }
    if (disposition === 'attachment') {
        params.set('disposition', 'attachment');
    }

    return params.toString();
}

export default function Reports({
    view,
    viewLabel,
    filters,
    summary,
    rows,
    projects,
    teams,
    advisors,
    generatedAt,
    filterLabels,
    reportSettingsUrl,
}: {
    view: Filters['view'];
    viewLabel: string;
    filters: Filters;
    summary: Summary;
    rows: ReportRow[];
    projects: Project[];
    teams: Team[];
    advisors: Advisor[];
    generatedAt: string;
    filterLabels: FilterLabels;
    reportSettingsUrl: string;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Reportes', href: '/inmopro/reports' },
        { title: 'Ventas', href: '/inmopro/reports/sales' },
    ];

    const topRows = useMemo(
        () =>
            rows.slice(0, 12).map((row) => ({
                name: row.label.length > 22 ? `${row.label.slice(0, 20)}…` : row.label,
                fullName: row.label,
                Ventas: row.sold_amount,
                Meta: row.goal_amount,
                pct: row.pct,
                color: row.color ?? '#0f172a',
            })),
        [rows],
    );

    const stackRows = useMemo(
        () =>
            rows.slice(0, 10).map((row) => ({
                name: row.label.length > 18 ? `${row.label.slice(0, 16)}…` : row.label,
                fullName: row.label,
                Cobrado: row.collected_amount,
                Pendiente: row.pending_amount,
            })),
        [rows],
    );

    const tableTotals = useMemo(() => {
        return rows.reduce(
            (acc, row) => ({
                sold: acc.sold + row.sold_amount,
                collected: acc.collected + row.collected_amount,
                pending: acc.pending + row.pending_amount,
                lots: acc.lots + row.lots_count,
            }),
            { sold: 0, collected: 0, pending: 0, lots: 0 },
        );
    }, [rows]);

    const filterSummary = [
        filterLabels.project ? `Proyecto: ${filterLabels.project}` : null,
        filterLabels.team ? `Equipo: ${filterLabels.team}` : null,
        filterLabels.advisor ? `Vendedor: ${filterLabels.advisor}` : null,
        filterLabels.start_date ? `Desde: ${filterLabels.start_date}` : null,
        filterLabels.end_date ? `Hasta: ${filterLabels.end_date}` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    const q = buildExportQueryString(view, filters);
    const pdfUrl = () => `/inmopro/reports/sales/pdf?${q}`;
    const pdfDownloadUrl = () => `/inmopro/reports/sales/pdf?${buildExportQueryString(view, filters, 'attachment')}`;
    const csvUrl = () => `/inmopro/reports/sales/csv?${q}`;

    const navigateWithFilters = (next: Partial<Pick<Filters, 'start_date' | 'end_date'>>) => {
        router.get(
            '/inmopro/reports/sales',
            {
                view,
                project_id: filters.project_id ?? undefined,
                team_id: filters.team_id ?? undefined,
                advisor_id: filters.advisor_id ?? undefined,
                start_date: next.start_date ?? filters.start_date ?? undefined,
                end_date: next.end_date ?? filters.end_date ?? undefined,
            },
            { preserveScroll: true },
        );
    };

    const applyDatePreset = (preset: 'this_month' | 'last_month' | 'quarter' | 'ytd') => {
        const end = new Date();

        if (preset === 'this_month') {
            const start = new Date(end.getFullYear(), end.getMonth(), 1);
            navigateWithFilters({ start_date: toYmdLocal(start), end_date: toYmdLocal(end) });

            return;
        }

        if (preset === 'last_month') {
            const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
            const lastDay = new Date(end.getFullYear(), end.getMonth(), 0);
            navigateWithFilters({ start_date: toYmdLocal(start), end_date: toYmdLocal(lastDay) });

            return;
        }

        if (preset === 'quarter') {
            const quarterIndex = Math.floor(end.getMonth() / 3);
            const start = new Date(end.getFullYear(), quarterIndex * 3, 1);
            navigateWithFilters({ start_date: toYmdLocal(start), end_date: toYmdLocal(end) });

            return;
        }

        const start = new Date(end.getFullYear(), 0, 1);
        navigateWithFilters({ start_date: toYmdLocal(start), end_date: toYmdLocal(end) });
    };

    const handleFilter = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(
            '/inmopro/reports/sales',
            {
                view: (formData.get('view') as Filters['view']) || 'projects',
                project_id: (formData.get('project_id') as string) || undefined,
                team_id: (formData.get('team_id') as string) || undefined,
                advisor_id: (formData.get('advisor_id') as string) || undefined,
                start_date: (formData.get('start_date') as string) || undefined,
                end_date: (formData.get('end_date') as string) || undefined,
            },
            { preserveScroll: true },
        );
    };

    const chartTooltipFormatter = (value: number | string) => {
        if (typeof value === 'number') {
            return [formatPen(value), ''];
        }

        return [value, ''];
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes - Inmopro" />
            <div className="space-y-8 p-4 md:p-6">
                <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3 lg:max-w-xl">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
                                Inteligencia comercial
                            </p>
                            <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                                Reporte por {viewLabel.toLowerCase()}
                            </h1>
                            <p className="text-sm text-slate-300">
                                Consolidado de ventas (precio de lote), metas, cobranza efectiva y saldo pendiente según
                                fecha de contrato. Excluye lotes en estado libre o pre-reserva.
                            </p>
                            <p className="text-xs font-semibold text-slate-400">
                                {filterSummary || 'Sin filtros aplicados'} · Generado el {generatedAt}
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                            <GlobalProgressRing pct={summary.pct} />
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                                <a
                                    href={pdfUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                                >
                                    <FileDown className="h-4 w-4" />
                                    Ver PDF
                                </a>
                                <a
                                    href={pdfDownloadUrl()}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/10"
                                >
                                    <FileDown className="h-4 w-4" />
                                    Descargar PDF
                                </a>
                                <a
                                    href={csvUrl()}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/30"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Exportar Excel / CSV
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="rounded-3xl border border-border bg-card text-card-foreground p-5 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Atajos de periodo
                        </span>
                        <span className="text-xs text-slate-400">(mantienen proyecto, equipo y vendedor)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('this_month')}>
                            Este mes
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('last_month')}>
                            Mes anterior
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('quarter')}>
                            Trimestre en curso
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('ytd')}>
                            Año en curso
                        </Button>
                    </div>
                </div>

                <form
                    onSubmit={handleFilter}
                    className="grid gap-4 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-3 xl:grid-cols-6"
                >
                    <p className="text-xs leading-relaxed text-slate-600 md:col-span-3 xl:col-span-6">
                        <span className="font-bold text-slate-800">Fechas:</span> si no eliges rango, se usa{' '}
                        <strong>desde el 1 del mes actual hasta hoy</strong> (fecha de contrato del lote). Déjalas vacías
                        y pulsa Filtrar para restablecer ese rango.
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 md:col-span-3 xl:col-span-6">
                        <span className="font-bold text-slate-800">Metas:</span> la tarjeta <strong>Meta</strong> del
                        resumen usa la{' '}
                        <strong>meta general</strong> configurada en{' '}
                        <a href={reportSettingsUrl} className="font-semibold text-sky-700 underline hover:text-sky-800">
                            Meta general de reportes
                        </a>{' '}
                        (no es la suma de metas por fila: ver indicador &quot;Σ metas fila&quot;). La meta por vendedor
                        es la <strong>cuota personal</strong> en{' '}
                        <a href="/inmopro/advisors" className="font-semibold text-sky-700 underline hover:text-sky-800">
                            Asesores
                        </a>
                        . En vista <strong>Equipos</strong>, la meta por fila es la <strong>meta grupal</strong> del team;
                        si está en 0, se usa la suma de cuotas del equipo.
                    </p>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Vista
                        <select
                            name="view"
                            defaultValue={view}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="projects">Por proyecto</option>
                            <option value="teams">Por equipo</option>
                            <option value="advisors">Por vendedor</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Proyecto
                        <select
                            name="project_id"
                            defaultValue={filters.project_id ?? ''}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">Todos</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Equipo
                        <select
                            name="team_id"
                            defaultValue={filters.team_id ?? ''}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">Todos</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Vendedor
                        <select
                            name="advisor_id"
                            defaultValue={filters.advisor_id ?? ''}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">Todos</option>
                            {advisors.map((advisor) => (
                                <option key={advisor.id} value={advisor.id}>
                                    {advisor.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Desde
                        <input
                            type="date"
                            name="start_date"
                            defaultValue={filters.start_date ?? ''}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </label>
                    <div className="flex flex-col gap-1.5 xl:col-span-2">
                        <span className="text-xs font-semibold text-slate-600">Hasta y acción</span>
                        <div className="flex gap-3">
                            <input
                                type="date"
                                name="end_date"
                                defaultValue={filters.end_date ?? ''}
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                            />
                            <Button type="submit" className="shrink-0 rounded-xl px-5">
                                Aplicar filtros
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <MetricCard label="Ventas" value={summary.sold_amount} icon={TrendingUp} tone="emerald" />
                    <MetricCard label="Meta general" value={summary.goal_amount} icon={Target} tone="sky" />
                    <MetricCard label="Σ metas fila" value={summary.rows_goal_sum} icon={Target} tone="slate" subtitle="Suma de metas de cada fila" />
                    <MetricCard label="Cobrado" value={summary.collected_amount} icon={Wallet} tone="slate" />
                    <MetricCard label="Pendiente" value={summary.pending_amount} icon={BarChart3} tone="amber" />
                    <MetricCard label={`${viewLabel} (filas)`} value={summary.entities_count} icon={Users} tone="rose" raw />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                    <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-slate-500" />
                            <div>
                                <h2 className="text-lg font-black text-slate-900">Ranking por ventas</h2>
                                <p className="text-xs text-slate-500">Hasta 12 filas · color según % cumplimiento de meta por fila</p>
                            </div>
                        </div>
                        {topRows.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="h-[380px] w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topRows} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            interval={0}
                                            angle={-32}
                                            textAnchor="end"
                                            height={70}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                                            formatter={chartTooltipFormatter}
                                            labelFormatter={(_, payload) =>
                                                payload?.[0]?.payload?.fullName != null
                                                    ? String(payload[0].payload.fullName)
                                                    : ''
                                            }
                                        />
                                        <Bar dataKey="Ventas" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                            {topRows.map((entry) => (
                                                <Cell
                                                    key={entry.fullName}
                                                    fill={entry.pct >= 100 ? '#10b981' : entry.color ?? '#0f172a'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900">Indicadores clave</h2>
                        <p className="mt-1 text-xs text-slate-500">Calculados sobre el conjunto filtrado (tabla inferior).</p>
                        <div className="mt-5 space-y-3 text-sm text-slate-600">
                            <Insight label="Cumplimiento vs meta general" value={`${summary.pct}%`} />
                            <Insight label="Recuperación (cobrado ÷ ventas)" value={`${summary.collection_pct}%`} />
                            <Insight label="Ticket medio (ventas ÷ lotes)" value={formatPen(summary.avg_sale_per_lot)} />
                            <Insight label="Lotes en el periodo" value={String(summary.lots_count)} />
                            <Insight label="Rango de fechas" value={rangeLabel(filters.start_date, filters.end_date)} />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-black text-slate-900">Composición cobrado vs pendiente</h2>
                        <p className="mt-1 text-xs text-slate-500">Primeras 10 filas del ranking · barras apiladas (S/)</p>
                    </div>
                    {stackRows.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="h-[340px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <StackedBarChart data={stackRows} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                                    <StackedCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        interval={0}
                                        angle={-28}
                                        textAnchor="end"
                                        height={64}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                                        formatter={chartTooltipFormatter}
                                        labelFormatter={(_, payload) =>
                                            payload?.[0]?.payload?.fullName != null
                                                ? String(payload[0].payload.fullName)
                                                : ''
                                        }
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <StackedBar dataKey="Cobrado" stackId="cash" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={44} />
                                    <StackedBar dataKey="Pendiente" stackId="cash" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={44} />
                                </StackedBarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-lg font-black text-slate-900">Detalle por {viewLabel.toLowerCase()}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Ventas, meta por fila, cumplimiento, cobranza y lotes. La fila Totales suma importes de la
                            tabla (la meta general sigue siendo la del resumen superior).
                        </p>
                    </div>

                    {rows.length === 0 ? (
                        <div className="px-6 py-14">
                            <EmptyState />
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1000px] text-left text-sm">
                                        <caption className="sr-only">
                                            Reporte de ventas por {entityColumnLabel(view)} con montos en soles
                                        </caption>
                                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    {entityColumnLabel(view)}
                                                </th>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    Ventas
                                                </th>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    Meta fila
                                                </th>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    Cumplimiento
                                                </th>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    Cobrado
                                                </th>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    Pendiente
                                                </th>
                                                <th scope="col" className="px-6 py-3 font-bold text-slate-500">
                                                    Lotes
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rows.map((row) => (
                                                <tr key={`${view}-${row.id}`} className="hover:bg-slate-50/70">
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-slate-900">{row.label}</p>
                                                        {row.team_name && (
                                                            <p className="text-xs font-semibold text-slate-500">{row.team_name}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-slate-800">
                                                        {formatPen(row.sold_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-slate-600">
                                                        {formatPen(row.goal_amount)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <ProgressWithLabel pct={row.pct} />
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-emerald-700">
                                                        {formatPen(row.collected_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-amber-700">
                                                        {formatPen(row.pending_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 tabular-nums text-slate-600">{row.lots_count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                                                <td className="px-6 py-4 text-slate-800">Totales</td>
                                                <td className="px-6 py-4 text-slate-900">{formatPen(tableTotals.sold)}</td>
                                                <td className="px-6 py-4 text-slate-400">—</td>
                                                <td className="px-6 py-4 text-slate-400">—</td>
                                                <td className="px-6 py-4 text-emerald-800">{formatPen(tableTotals.collected)}</td>
                                                <td className="px-6 py-4 text-amber-800">{formatPen(tableTotals.pending)}</td>
                                                <td className="px-6 py-4 tabular-nums text-slate-800">{tableTotals.lots}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-4 p-4 md:hidden">
                                {rows.map((row) => (
                                    <article
                                        key={`${view}-${row.id}-m`}
                                        className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-black text-slate-900">{row.label}</h3>
                                                {row.team_name && (
                                                    <p className="text-xs font-semibold text-slate-500">{row.team_name}</p>
                                                )}
                                            </div>
                                            <span className={badgeTone(row.pct)}>{row.pct}%</span>
                                        </div>
                                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <dt className="text-slate-500">Ventas</dt>
                                                <dd className="font-bold text-slate-800">{formatPen(row.sold_amount)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-slate-500">Meta</dt>
                                                <dd className="font-semibold text-slate-600">{formatPen(row.goal_amount)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-slate-500">Cobrado</dt>
                                                <dd className="font-bold text-emerald-700">{formatPen(row.collected_amount)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-slate-500">Pendiente</dt>
                                                <dd className="font-bold text-amber-700">{formatPen(row.pending_amount)}</dd>
                                            </div>
                                            <div className="col-span-2">
                                                <dt className="text-slate-500">Lotes</dt>
                                                <dd className="font-semibold text-slate-700">{row.lots_count}</dd>
                                            </div>
                                        </dl>
                                        <div className="mt-3">
                                            <ProgressWithLabel pct={row.pct} compact />
                                        </div>
                                    </article>
                                ))}
                                <div className="rounded-2xl border border-border bg-card text-card-foreground p-4 font-bold text-slate-900">
                                    <p className="text-xs uppercase text-slate-500">Totales</p>
                                    <p className="mt-1 text-sm">Ventas: {formatPen(tableTotals.sold)}</p>
                                    <p className="text-sm">Cobrado: {formatPen(tableTotals.collected)}</p>
                                    <p className="text-sm">Pendiente: {formatPen(tableTotals.pending)}</p>
                                    <p className="text-sm">Lotes: {tableTotals.lots}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function GlobalProgressRing({ pct }: { pct: number }) {
    const capped = Math.min(Math.max(pct, 0), 100);
    const radius = 52;
    const stroke = 8;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const offset = circumference - (capped / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2 text-center">
            <svg height={radius * 2} width={radius * 2} className="-rotate-90" aria-hidden>
                <circle stroke="#1e293b" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
                <circle
                    stroke="#34d399"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.4s ease' }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </svg>
            <div className="space-y-0.5">
                <p className="text-2xl font-black text-white">{pct}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">vs meta general</p>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
    tone,
    raw = false,
    subtitle,
}: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    tone: 'emerald' | 'sky' | 'slate' | 'amber' | 'rose';
    raw?: boolean;
    subtitle?: string;
}) {
    const toneKey = tone === 'sky' ? 'sky' : tone;
    const toneClasses = inmoproMetricTone[toneKey as keyof typeof inmoproMetricTone] ?? inmoproMetricTone.slate;

    return (
        <div className="rounded-3xl border border-border bg-card text-card-foreground p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                    {subtitle && <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{subtitle}</p>}
                    <p className={`mt-2 break-words text-xl font-black tracking-tight md:text-2xl ${toneClasses.value}`}>
                        {raw ? value.toLocaleString('es-PE') : formatPen(value)}
                    </p>
                </div>
                <div className={`shrink-0 rounded-2xl p-3 ${toneClasses.icon}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

function Insight({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 font-black text-slate-900">{value}</p>
        </div>
    );
}

function ProgressWithLabel({ pct, compact = false }: { pct: number; compact?: boolean }) {
    const width = Math.min(Math.max(pct, 0), 100);
    const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-sky-500' : 'bg-amber-500';

    return (
        <div className={compact ? 'space-y-1' : 'flex max-w-xs flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3'}>
            <div
                className={`h-2 overflow-hidden rounded-full bg-slate-100 ${compact ? 'w-full' : 'w-full sm:w-28'}`}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Cumplimiento ${pct} por ciento`}
            >
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${width}%` }} />
            </div>
            <span className={`shrink-0 font-bold tabular-nums ${badgeTone(pct)}`}>{pct}%</span>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-44 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
            <div>
                <p className="font-bold text-slate-700">No hay datos para este filtro.</p>
                <p className="mt-1 text-sm text-slate-500">
                    Amplía fechas, cambia de vista o quita filtros de proyecto, equipo o vendedor.
                </p>
            </div>
        </div>
    );
}

function rangeLabel(startDate?: string | null, endDate?: string | null): string {
    if (!startDate && !endDate) {
        return 'Rango por defecto (mes en curso)';
    }

    if (startDate && endDate) {
        return `${formatDate(startDate)} → ${formatDate(endDate)}`;
    }

    if (startDate) {
        return `Desde ${formatDate(startDate)}`;
    }

    return `Hasta ${formatDate(endDate)}`;
}

function badgeTone(pct: number): string {
    if (pct >= 100) {
        return 'inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800';
    }

    if (pct >= 60) {
        return 'inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800';
    }

    return 'inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800';
}
