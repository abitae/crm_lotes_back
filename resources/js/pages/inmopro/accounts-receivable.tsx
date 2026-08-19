import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, HandCoins, Plus, Search } from 'lucide-react';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate, todayIsoDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type CashAccount = { id: number; name: string; type: string };
type Project = { id: number; name: string };
type Team = { id: number; name: string };
type Installment = {
    id: number;
    sequence: number;
    due_date: string;
    amount: string;
    paid_amount: string;
    status: string;
};
type Payment = {
    id: number;
    amount: string;
    paid_at: string;
    payment_method: string;
    cash_account?: { name: string } | null;
};
type LotStatusOption = {
    id: number;
    name: string;
    code: string;
    color?: string | null;
};

type LotStatus = {
    name: string;
    code: string;
    color?: string | null;
} | null;
type LotItem = {
    id: number;
    block: string;
    number: string;
    price: string;
    remaining_balance: string | null;
    total_paid: number;
    overdue_installments: number;
    project?: { name: string } | null;
    client?: { name: string } | null;
    status?: LotStatus;
    installments: Installment[];
    payments: Payment[];
};

export default function AccountsReceivable({
    lots,
    projects,
    teams,
    lotStatuses,
    cashAccounts,
    summary,
    filters,
}: {
    lots: { data: LotItem[]; links: PaginationLink[] };
    projects: Project[];
    teams: Team[];
    lotStatuses: LotStatusOption[];
    cashAccounts: CashAccount[];
    summary: { portfolio: number; collected: number; pending: number; overdueInstallments: number };
    filters: { project_id?: string; team_id?: string; start_date?: string; end_date?: string; lot_status_id?: string; status?: string; search?: string };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Cuentas por cobrar', href: '/inmopro/accounts-receivable' },
    ];

    const [selectedLot, setSelectedLot] = useState<LotItem | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [installmentOpen, setInstallmentOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);

    const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get('/inmopro/accounts-receivable', {
            project_id: (formData.get('project_id') as string) || undefined,
            team_id: (formData.get('team_id') as string) || undefined,
            start_date: (formData.get('start_date') as string) || undefined,
            end_date: (formData.get('end_date') as string) || undefined,
            lot_status_id: (formData.get('lot_status_id') as string) || undefined,
            search: (formData.get('search') as string) || undefined,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas por cobrar - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="grid gap-4 md:grid-cols-4">
                    <InmoproMetricCard label="Portafolio" value={`S/ ${summary.portfolio.toLocaleString()}`} />
                    <InmoproMetricCard label="Cobrado" value={`S/ ${summary.collected.toLocaleString()}`} tone="emerald" />
                    <InmoproMetricCard label="Pendiente" value={`S/ ${summary.pending.toLocaleString()}`} tone="amber" />
                    <InmoproMetricCard label="Cuotas vencidas" value={summary.overdueInstallments.toLocaleString()} tone="rose" />
                </div>

                <form
                    onSubmit={handleFilter}
                    className="grid gap-3 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-2 xl:grid-cols-7"
                >
                    <select
                        name="project_id"
                        defaultValue={filters.project_id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                    >
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <select name="team_id" defaultValue={filters.team_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none">
                        <option value="">Todos los grupos</option>
                        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                    <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500">Fecha desde<input type="date" name="start_date" defaultValue={filters.start_date} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none" /></label>
                    <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500">Fecha hasta<input type="date" name="end_date" defaultValue={filters.end_date} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none" /></label>
                    <select
                        name="lot_status_id"
                        defaultValue={filters.lot_status_id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                    >
                        <option value="">Todos los estados de lote</option>
                        {lotStatuses.map((status) => (
                            <option key={status.id} value={status.id}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            name="search"
                            placeholder="Buscar por cliente o DNI"
                            defaultValue={filters.search}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Filtrar
                    </button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm sm:rounded-3xl">
                    <div className="border-b border-slate-100 px-3 py-2 sm:px-4">
                        <h2 className="text-sm font-black text-slate-900 sm:text-base">Cartera de cuentas por cobrar</h2>
                        <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                            Lotes financiados, saldos y acciones de cobro.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-2 py-2 text-left">Lote</th>
                                    <th className="px-2 py-2 text-left">Cliente</th>
                                    <th className="px-2 py-2 text-left">Estado</th>
                                    <th className="px-2 py-2 text-right">Montos</th>
                                    <th className="px-2 py-2 text-center">Cuotas</th>
                                    <th className="px-2 py-2 text-left">Mora</th>
                                    <th className="px-2 py-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lots.data.map((lot) => (
                                    <tr key={lot.id} className="align-top hover:bg-slate-50/70">
                                        <td className="px-2 py-1.5">
                                            <div className="font-semibold text-slate-900">
                                                {lot.block}-{lot.number}
                                            </div>
                                            <div className="max-w-[120px] truncate text-[10px] text-slate-500">
                                                {lot.project?.name ?? 'Sin proyecto'}
                                            </div>
                                        </td>
                                        <td className="max-w-[110px] truncate px-2 py-1.5 text-slate-600">
                                            {lot.client?.name ?? 'Sin cliente'}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${lot.status?.color ? 'text-white' : 'bg-slate-100 text-slate-700'}`}
                                                style={lot.status?.color ? { backgroundColor: lot.status.color } : undefined}
                                            >
                                                {lot.status?.name ?? 'Sin estado'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">
                                            <div className="text-slate-800">S/ {Number(lot.price).toLocaleString()}</div>
                                            <div className="text-[10px] text-emerald-700">Cob. S/ {lot.total_paid.toLocaleString()}</div>
                                            <div className="text-[10px] text-amber-600">
                                                Sal. S/ {Number(lot.remaining_balance ?? 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-center text-slate-600">{lot.installments.length}</td>
                                        <td className="px-2 py-1.5">
                                            {lot.overdue_installments > 0 ? (
                                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                                    {lot.overdue_installments}
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <div className="flex flex-wrap justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    title="Ver detalle"
                                                    onClick={() => {
                                                        setSelectedLot(lot);
                                                        setDetailOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Detalle</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    title="Nueva cuota"
                                                    onClick={() => {
                                                        setSelectedLot(lot);
                                                        setInstallmentOpen(true);
                                                    }}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Cuota</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    title="Registrar abono"
                                                    onClick={() => {
                                                        setSelectedLot(lot);
                                                        setPaymentOpen(true);
                                                    }}
                                                >
                                                    <HandCoins className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Abono</span>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-100 px-3 py-2">
                        <Pagination links={lots.links} />
                    </div>
                </div>
            </div>

            <LotDetailDialog lot={selectedLot} open={detailOpen} onOpenChange={setDetailOpen} />
            <InstallmentDialog lot={selectedLot} open={installmentOpen} onOpenChange={setInstallmentOpen} />
            <PaymentDialog
                lot={selectedLot}
                cashAccounts={cashAccounts}
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
            />
        </AppLayout>
    );
}


function LotDetailDialog({
    lot,
    open,
    onOpenChange,
}: {
    lot: LotItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        {lot ? `Detalle del lote ${lot.block}-${lot.number}` : 'Detalle del lote'}
                    </DialogTitle>
                    <DialogDescription>
                        Cronograma vigente y últimos pagos registrados.
                    </DialogDescription>
                </DialogHeader>

                {lot && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 p-4">
                            <h3 className="mb-3 text-sm font-black uppercase text-slate-700">Cronograma</h3>
                            <div className="space-y-2">
                                {lot.installments.length === 0 ? (
                                    <p className="text-sm text-slate-500">Sin cuotas registradas.</p>
                                ) : (
                                    lot.installments.map((installment) => (
                                        <div
                                            key={installment.id}
                                            className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
                                        >
                                            <span>
                                                Cuota {installment.sequence} · {formatDate(installment.due_date)}
                                            </span>
                                            <span className="font-bold">
                                                {installment.status} · S/ {Number(installment.amount).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 p-4">
                            <h3 className="mb-3 text-sm font-black uppercase text-slate-700">Pagos</h3>
                            <div className="space-y-2">
                                {lot.payments.length === 0 ? (
                                    <p className="text-sm text-slate-500">Sin pagos registrados.</p>
                                ) : (
                                    lot.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
                                        >
                                            <span>
                                                {formatDate(payment.paid_at)} · {payment.payment_method}
                                                {payment.cash_account?.name ? ` · ${payment.cash_account.name}` : ''}
                                            </span>
                                            <span className="font-bold text-emerald-600">
                                                S/ {Number(payment.amount).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function InstallmentDialog({
    lot,
    open,
    onOpenChange,
}: {
    lot: LotItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({
        due_date: todayIsoDate(),
        amount: '',
        notes: '',
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {lot ? `Nueva cuota para ${lot.block}-${lot.number}` : 'Nueva cuota'}
                    </DialogTitle>
                    <DialogDescription>Registre una nueva cuota del cronograma.</DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (!lot) {
                            return;
                        }

                        form.post(`/inmopro/lots/${lot.id}/installments`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset('amount', 'notes');
                                form.setData('due_date', todayIsoDate());
                                onOpenChange(false);
                            },
                        });
                    }}
                    className="space-y-4"
                >
                    <input
                        type="date"
                        value={form.data.due_date}
                        onChange={(event) => form.setData('due_date', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Monto"
                        value={form.data.amount}
                        onChange={(event) => form.setData('amount', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Notas"
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />

                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Guardar cuota
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PaymentDialog({
    lot,
    cashAccounts,
    open,
    onOpenChange,
}: {
    lot: LotItem | null;
    cashAccounts: CashAccount[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({
        lot_installment_id: '',
        cash_account_id: '',
        amount: '',
        paid_at: todayIsoDate(),
        payment_method: 'TRANSFERENCIA',
        reference: '',
        notes: '',
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {lot ? `Registrar abono para ${lot.block}-${lot.number}` : 'Registrar abono'}
                    </DialogTitle>
                    <DialogDescription>
                        El abono se registra desde modal y puede asociarse a una cuota específica.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (!lot) {
                            return;
                        }

                        form.post(`/inmopro/lots/${lot.id}/payments`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset('lot_installment_id', 'cash_account_id', 'amount', 'reference', 'notes');
                                form.setData('paid_at', todayIsoDate());
                                onOpenChange(false);
                            },
                        });
                    }}
                    className="space-y-4"
                >
                    <select
                        value={form.data.lot_installment_id}
                        onChange={(event) => form.setData('lot_installment_id', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    >
                        <option value="">Aplicar sin cuota específica</option>
                        {lot?.installments.map((installment) => (
                            <option key={installment.id} value={installment.id}>
                                Cuota {installment.sequence} · {installment.status}
                            </option>
                        ))}
                    </select>

                    <select
                        value={form.data.cash_account_id}
                        onChange={(event) => form.setData('cash_account_id', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    >
                        <option value="">Sin cuenta</option>
                        {cashAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} · {account.type}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Monto"
                        value={form.data.amount}
                        onChange={(event) => form.setData('amount', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                        type="date"
                        value={form.data.paid_at}
                        onChange={(event) => form.setData('paid_at', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <select
                        value={form.data.payment_method}
                        onChange={(event) => form.setData('payment_method', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    >
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="POS">POS</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Referencia"
                        value={form.data.reference}
                        onChange={(event) => form.setData('reference', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />

                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Registrar abono
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
