import { projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { TopAdvisorsExportActions } from '@/components/inmopro/reports/TopAdvisorsExportActions';
import { formatPen } from '@/lib/report-utils';

type Row = {
    advisor_name: string;
    team_name?: string | null;
    sold_amount: number;
    transfer_count: number;
    transfer_amount: number;
};

export default function TopAdvisorsReport({
    title,
    description,
    criteriaNote,
    filters,
    rows,
    summary,
    generatedAt,
    exportBaseUrl,
    projects,
    teams,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: Record<string, string | number | null>;
    rows: Row[];
    summary: { advisors_count: number; total_sold: number; total_transfers: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string; is_active?: boolean }[];
    teams: { id: number; name: string }[];
}) {
    return (
        <ReportPageShell
            title={title}
            description={description}
            criteriaNote={criteriaNote}
            generatedAt={generatedAt}
            exportBaseUrl={exportBaseUrl}
            exportQuery={filters}
            exportActions={<TopAdvisorsExportActions baseUrl={exportBaseUrl} query={filters} />}
        >
            <ReportDateFilters basePath="/inmopro/reports/top-advisors" filters={filters}>
                <select name="team_id" defaultValue={String(filters.team_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Todos los equipos</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <select name="project_id" defaultValue={String(filters.project_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Todos los proyectos</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {projectOptionLabel(p)}
                        </option>
                    ))}
                </select>
            </ReportDateFilters>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Vendedores en ranking</p>
                    <p className="text-2xl font-black">{summary.advisors_count}</p>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Ventas totales</p>
                    <p className="text-2xl font-black">{formatPen(summary.total_sold)}</p>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Transferencias</p>
                    <p className="text-2xl font-black">{summary.total_transfers}</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Vendedor</th>
                            <th className="px-4 py-3">Equipo</th>
                            <th className="px-4 py-3">Ventas</th>
                            <th className="px-4 py-3">Transferencias</th>
                            <th className="px-4 py-3">Monto transferido</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.advisor_name + i} className="border-b">
                                <td className="px-4 py-3">{i + 1}</td>
                                <td className="px-4 py-3 font-medium">{row.advisor_name}</td>
                                <td className="px-4 py-3">{row.team_name ?? '—'}</td>
                                <td className="px-4 py-3">{formatPen(row.sold_amount)}</td>
                                <td className="px-4 py-3">{row.transfer_count}</td>
                                <td className="px-4 py-3">{formatPen(row.transfer_amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportPageShell>
    );
}
