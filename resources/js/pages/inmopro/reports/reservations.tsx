import { router } from '@inertiajs/react';
import { projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { LotDetailTable } from '@/components/inmopro/reports/LotDetailTable';
import type { LotDetailRow } from '@/components/inmopro/reports/LotDetailTable';
import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';

export default function ReservationsReport({
    title,
    description,
    criteriaNote,
    filters,
    rows,
    pagination,
    summary,
    generatedAt,
    exportBaseUrl,
    projects,
    teams,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: Record<string, string | number | boolean | null>;
    rows: LotDetailRow[];
    pagination: { current_page: number; last_page: number; total: number; links: { url: string | null; label: string; active: boolean }[] } | null;
    summary: { total: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string; is_active?: boolean }[];
    teams: { id: number; name: string }[];
}) {
    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={filters}>
            <ReportDateFilters basePath="/inmopro/reports/reservations" filters={filters} extraFields={{ include_prereserva: filters.include_prereserva ? '1' : '0' }}>
                <select name="team_id" defaultValue={String(filters.team_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Todos los equipos</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <select name="project_id" defaultValue={String(filters.project_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Todos los proyectos</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{projectOptionLabel(p)}</option>
                    ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="include_prereserva" value="1" defaultChecked={Boolean(filters.include_prereserva)} />
                    Incluir pre-reservas
                </label>
            </ReportDateFilters>
            <p className="text-sm text-muted-foreground">Total: {summary.total} registros</p>
            <LotDetailTable rows={rows} />
            {pagination && pagination.last_page > 1 ? (
                <div className="flex flex-wrap gap-2">
                    {pagination.links.map((link, i) =>
                        link.url ? (
                            <button key={i} type="button" className={`rounded-lg border px-3 py-1 text-sm ${link.active ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => router.get(link.url!, {}, { preserveScroll: true })} dangerouslySetInnerHTML={{ __html: link.label }} />
                        ) : null,
                    )}
                </div>
            ) : null}
        </ReportPageShell>
    );
}
