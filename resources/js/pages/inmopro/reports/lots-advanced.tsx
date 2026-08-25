import { router } from '@inertiajs/react';
import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { formatDate } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';

type Row = {
    client_name?: string | null;
    city_name?: string | null;
    client_phone?: string | null;
    project_name?: string | null;
    block?: string | null;
    number?: string | number | null;
    status_name?: string | null;
    price?: number;
    advisor_name?: string | null;
    team_name?: string | null;
    contract_date?: string | null;
    payment_limit_date?: string | null;
    days_overdue?: number | null;
};

type ScopeOption = { value: string; label: string };

export default function LotsAdvancedReport({
    title,
    description,
    criteriaNote,
    filters,
    rows,
    pagination,
    summary,
    scopes,
    generatedAt,
    exportBaseUrl,
    projects,
    teams,
    advisors,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: Record<string, string | number | boolean | null>;
    rows: Row[];
    pagination: {
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    } | null;
    summary: {
        total: number;
        total_amount: number;
        by_status: { code: string; name: string; count: number }[];
    };
    scopes: ScopeOption[];
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string; is_active?: boolean }[];
    teams: { id: number; name: string }[];
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
            <ReportDateFilters
                basePath="/inmopro/reports/lots-advanced"
                filters={filters}
                extraFields={{
                    scope: filters.scope,
                    apply_dates: filters.apply_dates ? '1' : '0',
                }}
            >
                <select
                    name="scope"
                    defaultValue={String(filters.scope ?? 'reservado')}
                    className="rounded-xl border px-3 py-2 text-sm"
                >
                    {scopes.map((scope) => (
                        <option key={scope.value} value={scope.value}>
                            {scope.label}
                        </option>
                    ))}
                </select>
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
                <select
                    name="team_id"
                    defaultValue={String(filters.team_id ?? '')}
                    className="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Todos los equipos</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
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
                <label className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="apply_dates" value="0" />
                    <input
                        type="checkbox"
                        name="apply_dates"
                        value="1"
                        defaultChecked={Boolean(filters.apply_dates)}
                    />
                    Filtrar por fechas
                </label>
            </ReportDateFilters>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Lotes</p>
                    <p className="text-2xl font-black">{summary.total}</p>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Monto filtrado</p>
                    <p className="text-2xl font-black">{formatPen(summary.total_amount)}</p>
                </div>
                {summary.by_status.slice(0, 2).map((status) => (
                    <div key={status.code} className="rounded-2xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">{status.name}</p>
                        <p className="text-2xl font-black">{status.count}</p>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
                <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                            <th className="px-3 py-3">Cliente</th>
                            <th className="px-3 py-3">Ciudad</th>
                            <th className="px-3 py-3">Celular</th>
                            <th className="px-3 py-3">Proyecto</th>
                            <th className="px-3 py-3">MZ</th>
                            <th className="px-3 py-3">Lote</th>
                            <th className="px-3 py-3">Estado</th>
                            <th className="px-3 py-3">Monto</th>
                            <th className="px-3 py-3">Cazador</th>
                            <th className="px-3 py-3">Equipo</th>
                            <th className="px-3 py-3">F. contrato</th>
                            <th className="px-3 py-3">F. límite</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                                    Sin registros para los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-3 py-2">{row.client_name ?? '—'}</td>
                                    <td className="px-3 py-2">{row.city_name ?? '—'}</td>
                                    <td className="px-3 py-2">{row.client_phone ?? '—'}</td>
                                    <td className="px-3 py-2">{row.project_name ?? '—'}</td>
                                    <td className="px-3 py-2">{row.block ?? '—'}</td>
                                    <td className="px-3 py-2">{row.number ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        {row.status_name ?? '—'}
                                        {row.days_overdue != null ? (
                                            <span className="ml-1 text-xs text-destructive">
                                                (+{row.days_overdue}d)
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2">{formatPen(row.price ?? 0)}</td>
                                    <td className="px-3 py-2">{row.advisor_name ?? '—'}</td>
                                    <td className="px-3 py-2">{row.team_name ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        {row.contract_date ? formatDate(row.contract_date) : '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                        {row.payment_limit_date ? formatDate(row.payment_limit_date) : '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.last_page > 1 ? (
                <div className="flex flex-wrap gap-2">
                    {pagination.links.map((link, i) =>
                        link.url ? (
                            <button
                                key={i}
                                type="button"
                                className={`rounded-lg border px-3 py-1 text-sm ${link.active ? 'bg-primary text-primary-foreground' : ''}`}
                                onClick={() => router.get(link.url!, {}, { preserveScroll: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : null,
                    )}
                </div>
            ) : null}
        </ReportPageShell>
    );
}
