import { router } from '@inertiajs/react';
import { projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { formatDate } from '@/lib/date';
import { formatClientPhone, useCanViewClientPhone } from '@/lib/inmopro-permissions';
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
        per_page: number;
        links: PaginationLink[];
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
    const canViewPhone = useCanViewClientPhone();

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
                    per_page: filters.per_page,
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
                    <span className="mb-1 block text-xs font-semibold text-slate-500">
                        Cliente
                    </span>
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
                    <p className="text-xs text-muted-foreground">
                        Monto filtrado
                    </p>
                    <p className="text-2xl font-black">
                        {formatPen(summary.total_amount)}
                    </p>
                </div>
                {summary.by_status.slice(0, 2).map((status) => (
                    <div
                        key={status.code}
                        className="rounded-2xl border bg-card p-4"
                    >
                        <p className="text-xs text-muted-foreground">
                            {status.name}
                        </p>
                        <p className="text-2xl font-black">{status.count}</p>
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] table-auto text-xs">
                        <thead>
                            <tr className="border-b bg-muted/60 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                {[
                                    'Cliente',
                                    'Ciudad',
                                    'Celular',
                                    'Proyecto',
                                    'MZ',
                                    'Lote',
                                    'Estado',
                                    'Monto',
                                    'Cazador',
                                    'Equipo',
                                    'F. contrato',
                                    'F. límite',
                                ].map((heading) => (
                                    <th
                                        key={heading}
                                        className="px-2.5 py-2 whitespace-nowrap"
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={12}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        Sin registros para los filtros
                                        aplicados.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-b last:border-0 hover:bg-muted/30"
                                    >
                                        <td
                                            className="max-w-44 truncate px-2.5 py-1.5 font-medium"
                                            title={row.client_name ?? undefined}
                                        >
                                            {row.client_name ?? '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                                            {row.city_name ?? '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                                            {formatClientPhone(row.client_phone, canViewPhone)}
                                        </td>
                                        <td
                                            className="max-w-40 truncate px-2.5 py-1.5"
                                            title={
                                                row.project_name ?? undefined
                                            }
                                        >
                                            {row.project_name ?? '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5">
                                            {row.block ?? '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5">
                                            {row.number ?? '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                                            {row.status_name ?? '—'}
                                            {row.days_overdue != null ? (
                                                <span className="ml-1 text-xs text-destructive">
                                                    (+{row.days_overdue}d)
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right font-medium whitespace-nowrap">
                                            {formatPen(row.price ?? 0)}
                                        </td>
                                        <td
                                            className="max-w-36 truncate px-2.5 py-1.5"
                                            title={
                                                row.advisor_name ?? undefined
                                            }
                                        >
                                            {row.advisor_name ?? '—'}
                                        </td>
                                        <td
                                            className="max-w-32 truncate px-2.5 py-1.5"
                                            title={row.team_name ?? undefined}
                                        >
                                            {row.team_name ?? '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                                            {row.contract_date
                                                ? formatDate(row.contract_date)
                                                : '—'}
                                        </td>
                                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                                            {row.payment_limit_date
                                                ? formatDate(
                                                      row.payment_limit_date,
                                                  )
                                                : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination ? (
                    <div className="flex flex-col gap-2 border-t bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <span>
                                {pagination.total === 0
                                    ? 0
                                    : (pagination.current_page - 1) *
                                          pagination.per_page +
                                      1}
                                –
                                {Math.min(
                                    pagination.current_page *
                                        pagination.per_page,
                                    pagination.total,
                                )}{' '}
                                de {pagination.total}
                            </span>
                            <label className="flex items-center gap-1.5">
                                Filas
                                <select
                                    value={pagination.per_page}
                                    className="h-7 rounded-md border bg-background px-1.5 text-xs text-foreground"
                                    onChange={(event) =>
                                        router.get(
                                            '/inmopro/reports/lots-advanced',
                                            {
                                                ...filters,
                                                per_page: event.target.value,
                                                page: 1,
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {[20, 40, 80].map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                            <span>
                                Página {pagination.current_page} de{' '}
                                {pagination.last_page}
                            </span>
                            <Pagination
                                links={pagination.links}
                                className="justify-end"
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </ReportPageShell>
    );
}
