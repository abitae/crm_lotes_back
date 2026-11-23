import { projectOptionLabel } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { ReportDateFilters } from '@/components/inmopro/reports/ReportDateFilters';
import { ReportPageShell } from '@/components/inmopro/reports/ReportPageShell';
import { TopAdvisorsExportActions } from '@/components/inmopro/reports/TopAdvisorsExportActions';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';
import { useState } from 'react';

type Row = {
    id: number;
    rank: number;
    advisor_name: string;
    team_name?: string | null;
    sold_amount: number;
    transfer_count: number;
    transfer_amount: number;
};

type PaginationState = {
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};

type TransferDetail = {
    id: number;
    project_name?: string | null;
    block?: string | null;
    number?: string | number | null;
    client_name?: string | null;
    notarial_transfer_date?: string | null;
    price: number;
    transfer_amount: number;
};

export default function TopAdvisorsReport({
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
    rows: Row[];
    pagination: PaginationState;
    summary: { advisors_count: number; total_sold: number; total_transfers: number };
    generatedAt: string;
    exportBaseUrl: string;
    projects: { id: number; name: string; is_active?: boolean }[];
    teams: { id: number; name: string }[];
}) {
    const [open, setOpen] = useState(false);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [advisorName, setAdvisorName] = useState('');
    const [transfers, setTransfers] = useState<TransferDetail[]>([]);
    const [detailError, setDetailError] = useState<string | null>(null);

    const openTransfers = async (row: Row) => {
        setOpen(true);
        setAdvisorName(row.advisor_name);
        setTransfers([]);
        setDetailError(null);
        setLoadingId(row.id);

        const params = new URLSearchParams();
        if (filters.start_date) {
            params.set('start_date', String(filters.start_date));
        }
        if (filters.end_date) {
            params.set('end_date', String(filters.end_date));
        }
        if (filters.project_id) {
            params.set('project_id', String(filters.project_id));
        }
        if (filters.team_id) {
            params.set('team_id', String(filters.team_id));
        }
        if (filters.include_inactive) {
            params.set('include_inactive', '1');
        }

        try {
            const response = await fetch(
                `/inmopro/reports/top-advisors/${row.id}/transfers?${params.toString()}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                setDetailError('No se pudieron cargar las transferencias.');
                return;
            }

            const payload = (await response.json()) as {
                advisor?: { name?: string };
                transfers?: TransferDetail[];
            };
            setAdvisorName(payload.advisor?.name ?? row.advisor_name);
            setTransfers(payload.transfers ?? []);
        } catch {
            setDetailError('No se pudieron cargar las transferencias.');
        } finally {
            setLoadingId(null);
        }
    };

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
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                    Sin vendedores con transferencias en este periodo.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="border-b">
                                    <td className="px-4 py-3">{row.rank}</td>
                                    <td className="px-4 py-3 font-medium">{row.advisor_name}</td>
                                    <td className="px-4 py-3">{row.team_name ?? '—'}</td>
                                    <td className="px-4 py-3">{formatPen(row.sold_amount)}</td>
                                    <td className="px-4 py-3">{row.transfer_count}</td>
                                    <td className="px-4 py-3">{formatPen(row.transfer_amount)}</td>
                                    <td className="px-4 py-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openTransfers(row)}
                                        >
                                            Ver transferencias
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">
                    {pagination.total === 0
                        ? 'Sin resultados'
                        : `Mostrando ${pagination.from ?? 0}–${pagination.to ?? 0} de ${pagination.total} · Página ${pagination.current_page} de ${pagination.last_page}`}
                </p>
                <Pagination links={pagination.links} always />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Transferencias de {advisorName}</DialogTitle>
                        <DialogDescription>
                            Lotes transferidos en el periodo y con los filtros del ranking.
                        </DialogDescription>
                    </DialogHeader>
                    {loadingId !== null ? (
                        <p className="text-sm text-muted-foreground">Cargando transferencias…</p>
                    ) : detailError ? (
                        <p className="text-sm text-red-600">{detailError}</p>
                    ) : transfers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin transferencias para este vendedor.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                        <th className="px-2 py-2">Proyecto</th>
                                        <th className="px-2 py-2">MZ</th>
                                        <th className="px-2 py-2">Lote</th>
                                        <th className="px-2 py-2">Cliente</th>
                                        <th className="px-2 py-2">Fecha</th>
                                        <th className="px-2 py-2">Precio</th>
                                        <th className="px-2 py-2">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.map((transfer) => (
                                        <tr key={transfer.id} className="border-b">
                                            <td className="px-2 py-2">{transfer.project_name ?? '—'}</td>
                                            <td className="px-2 py-2">{transfer.block ?? '—'}</td>
                                            <td className="px-2 py-2">{transfer.number ?? '—'}</td>
                                            <td className="px-2 py-2">{transfer.client_name ?? '—'}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                {transfer.notarial_transfer_date
                                                    ? formatDate(transfer.notarial_transfer_date)
                                                    : '—'}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">{formatPen(transfer.price)}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                {formatPen(transfer.transfer_amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </ReportPageShell>
    );
}
