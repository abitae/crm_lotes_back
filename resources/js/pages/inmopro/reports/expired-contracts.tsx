import { router } from '@inertiajs/react';
import { IncludeInactiveProjectsField, projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { LotDetailTable } from '@/components/inmopro/reports/LotDetailTable';
import type { LotDetailRow } from '@/components/inmopro/reports/LotDetailTable';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';

export default function ExpiredContractsReport({
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
    advisors,
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
    advisors: { id: number; name: string }[];
}) {
    const onFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get('/inmopro/reports/expired-contracts', Object.fromEntries(new FormData(e.currentTarget).entries()), { preserveScroll: true });
    };

    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={filters}>
            <form onSubmit={onFilter} className="flex flex-wrap items-end gap-3 rounded-3xl border bg-card p-5">
                <select name="project_id" defaultValue={String(filters.project_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Proyecto</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{projectOptionLabel(p)}</option>
                    ))}
                </select>
                <select name="team_id" defaultValue={String(filters.team_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Equipo</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <select name="advisor_id" defaultValue={String(filters.advisor_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Vendedor</option>
                    {advisors.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
                <IncludeInactiveProjectsField checked={Boolean(filters.include_inactive)} />
                <Button type="submit">Filtrar</Button>
            </form>
            <p className="text-sm text-muted-foreground">Total vencidos: {summary.total}</p>
            <LotDetailTable rows={rows} showAdvance={false} />
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
