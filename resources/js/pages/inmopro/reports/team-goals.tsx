import { router } from '@inertiajs/react';
import { useState } from 'react';
import { LotDetailTable } from '@/components/inmopro/reports/LotDetailTable';
import type { LotDetailRow } from '@/components/inmopro/reports/LotDetailTable';
import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { formatPen } from '@/lib/report-utils';

type TeamRow = {
    id: number;
    team_name: string;
    sold_amount: number;
    goal_amount: number;
    lots_count: number;
    pct: number;
    detail: LotDetailRow[];
};

export default function TeamGoalsReport({
    title,
    description,
    criteriaNote,
    filters,
    rows,
    detail_rows,
    selected_team_id,
    summary,
    generatedAt,
    exportBaseUrl,
    teams,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: Record<string, string | number | null>;
    rows: TeamRow[];
    detail_rows: LotDetailRow[];
    selected_team_id: number | null;
    summary: { total_sold: number; total_goal: number };
    generatedAt: string;
    exportBaseUrl: string;
    teams: { id: number; name: string }[];
}) {
    const [teamId, setTeamId] = useState<number | null>(selected_team_id);
    const active = rows.find((r) => r.id === teamId) ?? rows[0];
    const detail = active?.detail ?? detail_rows;

    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={{ ...filters, team_id: teamId ?? undefined }}>
            <ReportDateFilters basePath="/inmopro/reports/team-goals" filters={filters} extraFields={{ team_id: teamId ?? undefined }}>
                <select
                    name="team_id"
                    value={teamId ?? ''}
                    onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        setTeamId(id);
                        router.get('/inmopro/reports/team-goals', { ...filters, team_id: id ?? undefined }, { preserveScroll: true });
                    }}
                    className="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Todos los equipos</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </ReportDateFilters>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-card p-4"><p className="text-xs">Ventas periodo</p><p className="text-2xl font-black">{formatPen(summary.total_sold)}</p></div>
                <div className="rounded-2xl border bg-card p-4"><p className="text-xs">Meta combinada</p><p className="text-2xl font-black">{formatPen(summary.total_goal)}</p></div>
            </div>
            <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs uppercase">
                            <th className="px-4 py-3">Equipo</th>
                            <th className="px-4 py-3">Ventas</th>
                            <th className="px-4 py-3">Meta</th>
                            <th className="px-4 py-3">%</th>
                            <th className="px-4 py-3">Lotes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className={`border-b cursor-pointer ${row.id === active?.id ? 'bg-emerald-50' : ''}`} onClick={() => setTeamId(row.id)}>
                                <td className="px-4 py-3 font-medium">{row.team_name}</td>
                                <td className="px-4 py-3">{formatPen(row.sold_amount)}</td>
                                <td className="px-4 py-3">{formatPen(row.goal_amount)}</td>
                                <td className="px-4 py-3">{row.pct}%</td>
                                <td className="px-4 py-3">{row.lots_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <h2 className="text-lg font-bold">Detalle — {active?.team_name ?? 'Equipo'}</h2>
            <LotDetailTable rows={detail} />
        </ReportPageShell>
    );
}
