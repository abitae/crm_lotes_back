import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { IncludeInactiveProjectsField, projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { LotDetailTable } from '@/components/inmopro/reports/LotDetailTable';
import type { LotDetailRow } from '@/components/inmopro/reports/LotDetailTable';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { Button } from '@/components/ui/button';

export default function FallenReport({
    title,
    description,
    criteriaNote,
    filters,
    aggregates,
    detail_rows,
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
    aggregates: { id: number; label: string; count: number }[];
    detail_rows: LotDetailRow[];
    summary: { total: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string; is_active?: boolean }[];
    teams: { id: number; name: string }[];
}) {
    const onFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get('/inmopro/reports/fallen', Object.fromEntries(new FormData(e.currentTarget).entries()), { preserveScroll: true });
    };

    const dimensionLabel = filters.dimension === 'project' ? 'Proyecto' : filters.dimension === 'advisor' ? 'Vendedor' : 'Equipo';

    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={filters}>
            <form onSubmit={onFilter} className="flex flex-wrap items-end gap-3 rounded-3xl border bg-card p-5">
                <select name="dimension" defaultValue={String(filters.dimension ?? 'team')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="team">Por equipo</option>
                    <option value="project">Por proyecto</option>
                    <option value="advisor">Por vendedor</option>
                </select>
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
                <IncludeInactiveProjectsField checked={Boolean(filters.include_inactive)} />
                <Button type="submit">Aplicar</Button>
            </form>
            <p className="text-sm text-muted-foreground">Total caídos: {summary.total}</p>
            <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs uppercase">
                            <th className="px-4 py-3">{dimensionLabel}</th>
                            <th className="px-4 py-3">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aggregates.map((row) => (
                            <tr key={row.id + row.label} className="border-b">
                                <td className="px-4 py-3 font-medium">{row.label}</td>
                                <td className="px-4 py-3">{row.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <h2 className="text-lg font-bold">Detalle</h2>
            <LotDetailTable rows={detail_rows} showAdvance={false} />
        </ReportPageShell>
    );
}
