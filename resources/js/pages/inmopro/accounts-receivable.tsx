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
    lotStatuses,
    cashAccounts,
    summary,
    filters,
}: {
    lots: { data: LotItem[]; links: PaginationLink[] };
    projects: Project[];
    lotStatuses: LotStatusOption[];
    cashAccounts: CashAccount[];
    summary: { portfolio: number; collected: number; pending: number; overdueInstallments: number };
    filters: { project_id?: string; lot_status_id?: string; status?: string; search?: string };
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
                    className="grid gap-3 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-2 lg:grid-cols-4"
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

                <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-lg font-black text-slate-900">Cartera de cuentas por cobrar</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Vista tabular de lotes financiados, saldos y acciones de cobro.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500">Lote</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Proyecto</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Cliente</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Estado lote</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Precio</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Cobrado</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Saldo</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Cuotas</th>
                                    <th className="px-6 py-3 font-bold text-slate-500">Mora</th>
                                    <th className="px-6 py-3 text-right font-bold text-slate-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lots.data.map((lot) => (
                                    <tr key={lot.id} className="hover:bg-slate-50/70">
                                        <td className="px-6 py-4 font-black text-slate-900">
                                            {lot.block}-{lot.number}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {lot.project?.name ?? 'Sin proyecto'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {lot.client?.name ?? 'Sin cliente'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${lot.status?.color ? 'text-white' : 'bg-slate-100 text-slate-700'}`}
                                                style={lot.status?.color ? { backgroundColor: lot.status.color } : undefined}
                                            >
                                                {lot.status?.name ?? 'Sin estado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-800">
                                            S/ {Number(lot.price).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-emerald-600">
                                            S/ {lot.total_paid.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-amber-600">
                                            S/ {Number(lot.remaining_balance ?? 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{lot.installments.length}</td>
                                        <td className="px-6 py-4">
                                            {lot.overdue_installments > 0 ? (
                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                                                    {lot.overdue_installments} vencidas
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                                    Al dia
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedLot(lot);
                                                        setDetailOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Detalle
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedLot(lot);
                                                        setInstallmentOpen(true);
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Cuota
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedLot(lot);
                                                        setPaymentOpen(true);
                                                    }}
                                                >
                                                    <HandCoins className="h-4 w-4" />
                                                    Abono
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-100 px-4 py-3">
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
