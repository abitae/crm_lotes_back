import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { Button } from '@/components/ui/button';
import { formatPen } from '@/lib/report-utils';

type Row = {
    project_name: string;
    libre_count: number;
    reservado_count: number;
    transferido_count: number;
    total_count: number;
    reservado_amount: number;
    transferido_amount: number;
};

export default function ProjectInventoryReport({
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
    summary: { libre: number; reservado: number; transferido: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string }[];
}) {
    const onFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get('/inmopro/reports/project-inventory', Object.fromEntries(new FormData(e.currentTarget).entries()), { preserveScroll: true });
    };

    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={filters}>
            <form onSubmit={onFilter} className="flex flex-wrap gap-3 rounded-3xl border bg-card p-5">
                <select name="project_id" defaultValue={String(filters.project_id ?? '')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="">Todos los proyectos</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select name="client_origin" defaultValue={String(filters.client_origin ?? 'all')} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="all">Todos (no aplica a libres)</option>
                    <option value="propio">Propio</option>
                    <option value="tercero">Tercero (datero)</option>
                </select>
                <Button type="submit">Aplicar</Button>
            </form>
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-emerald-50 p-4"><p className="text-xs">Libres</p><p className="text-2xl font-black">{summary.libre}</p></div>
                <div className="rounded-2xl border bg-amber-50 p-4"><p className="text-xs">Reservados</p><p className="text-2xl font-black">{summary.reservado}</p></div>
                <div className="rounded-2xl border bg-slate-100 p-4"><p className="text-xs">Transferidos</p><p className="text-2xl font-black">{summary.transferido}</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((row) => (
                    <article key={row.project_name} className="rounded-3xl border bg-card p-5 shadow-sm">
                        <h2 className="text-lg font-bold">{row.project_name}</h2>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div><dt className="text-muted-foreground">Libres</dt><dd className="font-bold">{row.libre_count}</dd></div>
                            <div><dt className="text-muted-foreground">Reservados</dt><dd className="font-bold">{row.reservado_count}</dd></div>
                            <div><dt className="text-muted-foreground">Transferidos</dt><dd className="font-bold">{row.transferido_count}</dd></div>
                            <div><dt className="text-muted-foreground">Total</dt><dd className="font-bold">{row.total_count}</dd></div>
                            <div className="col-span-2"><dt className="text-muted-foreground">Monto reservado</dt><dd>{formatPen(row.reservado_amount)}</dd></div>
                            <div className="col-span-2"><dt className="text-muted-foreground">Monto transferido</dt><dd>{formatPen(row.transferido_amount)}</dd></div>
                        </dl>
                    </article>
                ))}
            </div>
        </ReportPageShell>
    );
}
