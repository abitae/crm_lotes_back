import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { Button } from '@/components/ui/button';
import { formatPen } from '@/lib/report-utils';

type Row = {
    project_name: string;
    year: number;
    month: number;
    month_label: string;
    transfer_count: number;
    transfer_amount: number;
};

export default function TransfersByProjectReport({
    title,
    description,
    criteriaNote,
    filters,
    rows,
    summary,
    generatedAt,
    exportBaseUrl,
    projects,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: Record<string, string | number | null>;
    rows: Row[];
    summary: { total_count: number; total_amount: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string }[];
}) {
    const onFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get('/inmopro/reports/transfers-by-project', Object.fromEntries(new FormData(e.currentTarget).entries()), { preserveScroll: true });
    };

    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={filters}>
            <form onSubmit={onFilter} className="flex flex-wrap gap-3 rounded-3xl border bg-card p-5">
                <input type="number" name="year" defaultValue={String(filters.year ?? new Date().getFullYear())} className="w-28 rounded-xl border px-3 py-2" min={2020} max={2100} />
                <select name="project_id" defaultValue={String(filters.project_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Todos los proyectos</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <Button type="submit">Aplicar</Button>
            </form>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Transferencias</p><p className="text-2xl font-black">{summary.total_count}</p></div>
                <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Monto total</p><p className="text-2xl font-black">{formatPen(summary.total_amount)}</p></div>
            </div>
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
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b">
                                <td className="px-4 py-3">{row.project_name}</td>
                                <td className="px-4 py-3">{row.month_label} {row.year}</td>
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
