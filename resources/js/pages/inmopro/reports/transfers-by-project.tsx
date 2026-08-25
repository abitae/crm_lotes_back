import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { formatDate } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';

type AggregateRow = {
    project_name: string;
    year: number;
    month: number;
    month_label: string;
    transfer_count: number;
    transfer_amount: number;
};

type DetailRow = {
    id: number;
    client_name?: string | null;
    city_name?: string | null;
    project_name?: string | null;
    block?: string | null;
    number?: string | number | null;
    amount: number;
    reviewed_at?: string | null;
    advisor_name?: string | null;
};

export default function TransfersByProjectReport({
    title,
    description,
    criteriaNote,
    filters,
    rows,
    detail_rows,
    summary,
    generatedAt,
    exportBaseUrl,
    projects,
    advisors,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: Record<string, string | number | null>;
    rows: AggregateRow[];
    detail_rows: DetailRow[];
    summary: { total_count: number; total_amount: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string; is_active?: boolean }[];
    advisors: { id: number; name: string }[];
}) {
    return (
        <ReportPageShell
            title={title}
            description={description}
            criteriaNote={criteriaNote}
            generatedAt={generatedAt}
            exportBaseUrl={exportBaseUrl}
            exportQuery={filters}
        >
            <ReportDateFilters basePath="/inmopro/reports/transfers-by-project" filters={filters}>
                <select
                    name="project_id"
                    defaultValue={String(filters.project_id ?? '')}
                    className="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Todos los proyectos</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {projectOptionLabel(p)}
                        </option>
                    ))}
                </select>
                <select
                    name="advisor_id"
                    defaultValue={String(filters.advisor_id ?? '')}
                    className="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Todos los cazadores</option>
                    {advisors.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name}
                        </option>
                    ))}
                </select>
                <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Cliente</span>
                    <input
                        type="search"
                        name="client_search"
                        defaultValue={String(filters.client_search ?? '')}
                        placeholder="Nombre, DNI o celular"
                        className="rounded-xl border px-3 py-2 text-sm"
                    />
                </label>
            </ReportDateFilters>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Transferencias</p>
                    <p className="text-2xl font-black">{summary.total_count}</p>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Monto total</p>
                    <p className="text-2xl font-black">{formatPen(summary.total_amount)}</p>
                </div>
            </div>

            <h2 className="text-lg font-bold">Detalle</h2>
            <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
                <table className="w-full min-w-[960px] text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Ciudad</th>
                            <th className="px-4 py-3">Proyecto</th>
                            <th className="px-4 py-3">MZ</th>
                            <th className="px-4 py-3">Lote</th>
                            <th className="px-4 py-3">Monto</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Cazador</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detail_rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                    Sin transferencias para los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            detail_rows.map((row) => (
                                <tr key={row.id} className="border-b">
                                    <td className="px-4 py-3">{row.client_name ?? '—'}</td>
                                    <td className="px-4 py-3">{row.city_name ?? '—'}</td>
                                    <td className="px-4 py-3">{row.project_name ?? '—'}</td>
                                    <td className="px-4 py-3">{row.block ?? '—'}</td>
                                    <td className="px-4 py-3">{row.number ?? '—'}</td>
                                    <td className="px-4 py-3">{formatPen(row.amount)}</td>
                                    <td className="px-4 py-3">
                                        {row.reviewed_at ? formatDate(row.reviewed_at) : '—'}
                                    </td>
                                    <td className="px-4 py-3">{row.advisor_name ?? '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <h2 className="text-lg font-bold">Resumen mensual por proyecto</h2>
            <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                            <th className="px-4 py-3">Proyecto</th>
                            <th className="px-4 py-3">Mes</th>
                            <th className="px-4 py-3">Cantidad</th>
                            <th className="px-4 py-3">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                    Sin consolidado para el periodo.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, i) => (
                                <tr key={`${row.project_name}-${row.year}-${row.month}-${i}`} className="border-b">
                                    <td className="px-4 py-3">{row.project_name}</td>
                                    <td className="px-4 py-3">
                                        {row.month_label} {row.year}
                                    </td>
                                    <td className="px-4 py-3">{row.transfer_count}</td>
                                    <td className="px-4 py-3">{formatPen(row.transfer_amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </ReportPageShell>
    );
}
