import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { IncludeInactiveProjectsField } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { LotDetailTable } from '@/components/inmopro/reports/LotDetailTable';
import type { LotDetailRow } from '@/components/inmopro/reports/LotDetailTable';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { Button } from '@/components/ui/button';

export default function ContractsWeekReport({
    title,
    description,
    criteriaNote,
    filters,
    reserved_rows,
    transferred_rows,
    summary,
    generatedAt,
    exportBaseUrl,
}: {
    title: string;
    description: string;
    criteriaNote?: string;
    filters: { start_date: string; end_date: string; week_date?: string | null; include_inactive?: boolean | null };
    reserved_rows: LotDetailRow[];
    transferred_rows: LotDetailRow[];
    summary: { reserved_count: number; transferred_count: number };
    generatedAt: string;
    exportBaseUrl: string;
}) {
    const onWeek = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get(
            '/inmopro/reports/contracts-week',
            Object.fromEntries(new FormData(e.currentTarget).entries()),
            { preserveScroll: true },
        );
    };

    return (
        <ReportPageShell title={title} description={description} criteriaNote={criteriaNote} generatedAt={generatedAt} exportBaseUrl={exportBaseUrl} exportQuery={filters}>
            <form onSubmit={onWeek} className="flex flex-wrap items-end gap-3 rounded-3xl border bg-card p-5">
                <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">Semana (cualquier día)</span>
                    <input type="date" name="week_date" defaultValue={filters.week_date ?? filters.start_date} className="rounded-xl border px-3 py-2" />
                </label>
                <p className="text-sm text-muted-foreground">
                    {filters.start_date} — {filters.end_date}
                </p>
                <IncludeInactiveProjectsField checked={Boolean(filters.include_inactive)} />
                <Button type="submit">Cambiar semana</Button>
            </form>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Reservados (contrato en semana)</p>
                    <p className="text-2xl font-black">{summary.reserved_count}</p>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Transferidos (aprobación en semana)</p>
                    <p className="text-2xl font-black">{summary.transferred_count}</p>
                </div>
            </div>
            <h2 className="text-lg font-bold">Reservados</h2>
            <LotDetailTable rows={reserved_rows} showAdvance={false} />
            <h2 className="text-lg font-bold">Transferidos</h2>
            <LotDetailTable rows={transferred_rows} showAdvance={false} />
        </ReportPageShell>
    );
}
