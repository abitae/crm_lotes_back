import { Head, router, useForm } from '@inertiajs/react';
import { CalendarRange, Eye, HandCoins, ImagePlus, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import InputError from '@/components/input-error';
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
    lot_payment_plan_id: number | null;
    sequence: number;
    due_date: string;
    amount: string;
    paid_amount: string;
    status: string;
};
type PaymentAllocation = {
    id: number;
    amount: string;
    installment?: { id: number; sequence: number } | null;
};
type Payment = {
    id: number;
    amount: string;
    paid_at: string;
    payment_method: string;
    voucher_path?: string | null;
    cash_account?: { name: string } | null;
    allocations: PaymentAllocation[];
};
type PaymentPlan = {
    id: number;
    financed_amount: string;
    installments_count: number;
    frequency: string;
    first_due_date: string;
    status: string;
    created_at: string;
    replaced_at: string | null;
};
type ScheduleMode = 'AGREGAR' | 'REPROGRAMAR';
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
    sale_price: string | null;
    advance: number;
    remaining_balance: number;
    total_scheduled: number;
    overdue_installments: number;
    can_receive_payments: boolean;
    project?: { name: string } | null;
    client?: { name: string } | null;
    status?: LotStatus;
    installments: Installment[];
    payments: Payment[];
    payment_plans: PaymentPlan[];
    schedulable_amount: Record<ScheduleMode, number>;
    next_installment: { sequence: number; due_date: string; balance: number } | null;
    overdue_days: number;
};

const FREQUENCY_LABELS: Record<string, string> = {
    MENSUAL: 'Mensual',
    QUINCENAL: 'Quincenal',
    SEMANAL: 'Semanal',
};

const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
    VENCIDA: 'Vencida',
    PAGADA: 'Pagada',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    TRANSFERENCIA: 'Transferencia',
    EFECTIVO: 'Efectivo',
    POS: 'POS',
};

const ACCOUNTS_RECEIVABLE_URL = '/inmopro/accounts-receivable';

function formatMoney(value: number | string | null | undefined): string {
    return `S/ ${Number(value ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function installmentBalance(installment: Installment): number {
    return Math.max(0, Number(installment.amount) - Number(installment.paid_amount));
}

function unpaidInstallmentsOldestFirst(installments: Installment[]): Installment[] {
    return installments
        .filter((installment) => installmentBalance(installment) > 0)
        .sort((first, second) => first.due_date.localeCompare(second.due_date) || first.sequence - second.sequence);
}

function addToIsoDate(isoDate: string, frequency: string, index: number): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);

    if (frequency === 'MENSUAL') {
        const targetMonth = month - 1 + index;
        const targetYear = year + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;
        const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();

        return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
    }

    const stepDays = frequency === 'QUINCENAL' ? 15 : 7;

    return new Date(Date.UTC(year, month - 1, day + stepDays * index)).toISOString().slice(0, 10);
}

/**
 * Misma regla que PaymentScheduleService::buildInstallments: cuotas iguales truncadas al céntimo y la última absorbe la diferencia.
 */
function buildSchedulePreview(financedAmount: number, count: number, frequency: string, firstDueDate: string) {
    if (!firstDueDate || count < 1 || financedAmount <= 0) {
        return [];
    }

    const totalCents = Math.round(financedAmount * 100);
    const baseCents = Math.floor(totalCents / count);

    return Array.from({ length: count }, (_, index) => ({
        number: index + 1,
        dueDate: addToIsoDate(firstDueDate, frequency, index),
        amount: (index === count - 1 ? totalCents - baseCents * (count - 1) : baseCents) / 100,
    }));
}

export default function AccountsReceivable({
    lots,
    projects,
    teams,
    lotStatuses,
    installmentStatuses,
    paymentMethods,
    scheduleFrequencies,
    cashAccounts,
    summary,
    filters,
}: {
    lots: { data: LotItem[]; links: PaginationLink[] };
    projects: Project[];
    teams: Team[];
    lotStatuses: LotStatusOption[];
    installmentStatuses: string[];
    paymentMethods: string[];
    scheduleFrequencies: string[];
    cashAccounts: CashAccount[];
    summary: { portfolio: number; scheduled: number; collected: number; pending: number; overdueInstallments: number };
    filters: { project_id?: string; team_id?: string; start_date?: string; end_date?: string; lot_status_id?: string; status?: string; search?: string };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Cuentas por cobrar', href: ACCOUNTS_RECEIVABLE_URL },
    ];

    const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [installmentOpen, setInstallmentOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const selectedLot = lots.data.find((lot) => lot.id === selectedLotId) ?? null;

    const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(ACCOUNTS_RECEIVABLE_URL, {
            project_id: (formData.get('project_id') as string) || undefined,
            team_id: (formData.get('team_id') as string) || undefined,
            start_date: (formData.get('start_date') as string) ?? '',
            end_date: (formData.get('end_date') as string) ?? '',
            lot_status_id: (formData.get('lot_status_id') as string) || undefined,
            status: (formData.get('status') as string) || undefined,
            search: (formData.get('search') as string) || undefined,
        });
    };

    const showWholePortfolio = () => {
        router.get(ACCOUNTS_RECEIVABLE_URL, {
            project_id: filters.project_id || undefined,
            team_id: filters.team_id || undefined,
            lot_status_id: filters.lot_status_id || undefined,
            status: filters.status || undefined,
            search: filters.search || undefined,
            start_date: '',
            end_date: '',
        });
    };

    const openDialog = (lot: LotItem, open: (value: boolean) => void) => {
        setSelectedLotId(lot.id);
        open(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas por cobrar - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="grid gap-4 md:grid-cols-4">
                    <InmoproMetricCard label="Portafolio" value={formatMoney(summary.portfolio)} />
                    <InmoproMetricCard label="Cobrado" value={formatMoney(summary.collected)} tone="emerald" />
                    <InmoproMetricCard label="Pendiente" value={formatMoney(summary.pending)} tone="amber" />
                    <InmoproMetricCard label="Cuotas vencidas" value={summary.overdueInstallments.toLocaleString('es-PE')} tone="rose" />
                </div>

                <form
                    onSubmit={handleFilter}
                    className="grid gap-3 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-2 xl:grid-cols-4"
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
                    <select
                        name="status"
                        defaultValue={filters.status}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                    >
                        <option value="">Todos los estados de cuota</option>
                        {installmentStatuses.map((status) => (
                            <option key={status} value={status}>
                                {INSTALLMENT_STATUS_LABELS[status] ?? status}
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
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={showWholePortfolio}
                            title="Quitar el filtro de fechas de contrato"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Toda la cartera
                        </button>
                    </div>
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
                                            <div className="text-slate-800">{formatMoney(lot.sale_price ?? lot.price)}</div>
                                            <div className="text-[10px] text-emerald-700">Cob. {formatMoney(lot.advance)}</div>
                                            <div className="text-[10px] text-amber-600">
                                                Sal. {formatMoney(lot.remaining_balance)}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-center text-slate-600">
                                            <div>{lot.installments.length}</div>
                                            {lot.next_installment ? (
                                                <div className="text-[10px] text-slate-500">
                                                    Próx. #{lot.next_installment.sequence} · {formatDate(lot.next_installment.due_date)}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {lot.overdue_installments > 0 ? (
                                                <span
                                                    className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                                                    title={`${lot.overdue_installments} cuota(s) vencida(s)`}
                                                >
                                                    {lot.overdue_installments} · {lot.overdue_days} d
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
                                                    onClick={() => openDialog(lot, setDetailOpen)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Detalle</span>
                                                </Button>
                                                {lot.status?.code === 'CUOTAS' ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        title="Generar cronograma de pagos"
                                                        onClick={() => openDialog(lot, setScheduleOpen)}
                                                    >
                                                        <CalendarRange className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Cronograma</span>
                                                    </Button>
                                                ) : null}
                                                {lot.status?.code === 'CUOTAS' ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        title="Nueva cuota"
                                                        onClick={() => openDialog(lot, setInstallmentOpen)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Cuota</span>
                                                    </Button>
                                                ) : null}
                                                {lot.can_receive_payments ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        title="Registrar abono"
                                                        onClick={() => openDialog(lot, setPaymentOpen)}
                                                    >
                                                        <HandCoins className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Abono</span>
                                                    </Button>
                                                ) : null}
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
            <ScheduleDialog
                key={selectedLot ? `schedule-${selectedLot.id}` : 'schedule'}
                lot={selectedLot}
                frequencies={scheduleFrequencies}
                open={scheduleOpen}
                onOpenChange={setScheduleOpen}
            />
            <PaymentDialog
                lot={selectedLot}
                cashAccounts={cashAccounts}
                paymentMethods={paymentMethods}
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

                {lot && lot.payment_plans.length > 0 ? (
                    <div className="rounded-2xl border border-slate-100 p-4">
                        <h3 className="mb-2 text-sm font-black uppercase text-slate-700">Cronogramas</h3>
                        <ul className="space-y-1 text-sm">
                            {lot.payment_plans.map((plan) => (
                                <li key={plan.id} className={`flex flex-wrap justify-between gap-2 ${plan.status === 'ACTIVO' ? '' : 'text-slate-400'}`}>
                                    <span>
                                        {plan.installments_count} cuotas {(FREQUENCY_LABELS[plan.frequency] ?? plan.frequency).toLowerCase()}es desde{' '}
                                        {formatDate(plan.first_due_date)}
                                    </span>
                                    <span className="font-semibold">
                                        {formatMoney(plan.financed_amount)} · {plan.status === 'ACTIVO' ? 'Activo' : `Reemplazado ${formatDate(plan.replaced_at ?? '')}`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

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
                                            <span className="text-right font-bold">
                                                {INSTALLMENT_STATUS_LABELS[installment.status] ?? installment.status} · {formatMoney(installment.amount)}
                                                {Number(installment.paid_amount) > 0 && installmentBalance(installment) > 0 ? (
                                                    <span className="block text-xs font-semibold text-amber-600">
                                                        Saldo {formatMoney(installmentBalance(installment))}
                                                    </span>
                                                ) : null}
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
                                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm"
                                        >
                                            <div className="min-w-0">
                                                <p>
                                                    {formatDate(payment.paid_at)} · {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                                                    {payment.cash_account?.name ? ` · ${payment.cash_account.name}` : ''}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {payment.allocations.length > 0
                                                        ? `Aplicado a ${payment.allocations
                                                              .map((allocation) => `cuota ${allocation.installment?.sequence ?? '?'} (${formatMoney(allocation.amount)})`)
                                                              .join(', ')}`
                                                        : 'Abono al saldo del lote'}
                                                </p>
                                                {payment.voucher_path ? (
                                                    <a
                                                        href={`/inmopro/lot-payments/${payment.id}/voucher`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs font-semibold text-sky-700 hover:underline"
                                                    >
                                                        Ver comprobante
                                                    </a>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                <span className="font-bold text-emerald-600">{formatMoney(payment.amount)}</span>
                                                {lot.status?.code !== 'TRANSFERIDO' ? <VoidPaymentForm paymentId={payment.id} /> : null}
                                            </div>
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

function VoidPaymentForm({ paymentId }: { paymentId: number }) {
    const [expanded, setExpanded] = useState(false);
    const form = useForm({ reason: '' });

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs font-semibold text-rose-600 hover:underline"
            >
                Anular
            </button>
        );
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.delete(`/inmopro/lot-payments/${paymentId}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        form.reset();
                        setExpanded(false);
                    },
                });
            }}
            className="flex w-56 flex-col gap-1"
        >
            <input
                type="text"
                autoFocus
                placeholder="Motivo de la anulación"
                value={form.data.reason}
                onChange={(event) => form.setData('reason', event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none"
            />
            <InputError message={form.errors.reason} />
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => {
                        form.reset();
                        form.clearErrors();
                        setExpanded(false);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:underline"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="text-xs font-bold text-rose-600 hover:underline disabled:opacity-50"
                >
                    Confirmar anulación
                </button>
            </div>
        </form>
    );
}

function ScheduleDialog({
    lot,
    frequencies,
    open,
    onOpenChange,
}: {
    lot: LotItem | null;
    frequencies: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const hasInstallments = (lot?.installments.length ?? 0) > 0;
    const form = useForm<{
        mode: ScheduleMode;
        installments_count: string;
        frequency: string;
        first_due_date: string;
        financed_amount: string;
        notes: string;
    }>({
        mode: 'AGREGAR',
        installments_count: '12',
        frequency: frequencies[0] ?? 'MENSUAL',
        first_due_date: todayIsoDate(),
        financed_amount: '',
        notes: '',
    });

    const available = lot?.schedulable_amount[form.data.mode] ?? 0;
    const financedAmount = form.data.financed_amount === '' ? available : Number(form.data.financed_amount);
    const preview = useMemo(
        () => buildSchedulePreview(financedAmount, Number(form.data.installments_count), form.data.frequency, form.data.first_due_date),
        [financedAmount, form.data.installments_count, form.data.frequency, form.data.first_due_date],
    );
    const keptInstallments = lot?.installments.filter((installment) => Number(installment.paid_amount) > 0).length ?? 0;
    const removedInstallments = (lot?.installments.length ?? 0) - keptInstallments;

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    form.clearErrors();
                }
                onOpenChange(nextOpen);
            }}
        >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{lot ? `Cronograma de pagos ${lot.block}-${lot.number}` : 'Cronograma de pagos'}</DialogTitle>
                    <DialogDescription>
                        Saldo del lote: {formatMoney(lot?.remaining_balance)}. Disponible para programar: {formatMoney(available)}.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (!lot) {
                            return;
                        }

                        form.post(`/inmopro/lots/${lot.id}/payment-schedule`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset();
                                onOpenChange(false);
                            },
                        });
                    }}
                    className="space-y-4"
                >
                    {hasInstallments ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {(['AGREGAR', 'REPROGRAMAR'] as ScheduleMode[]).map((mode) => (
                                <label
                                    key={mode}
                                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${form.data.mode === mode ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}
                                >
                                    <input
                                        type="radio"
                                        name="mode"
                                        value={mode}
                                        checked={form.data.mode === mode}
                                        onChange={() => form.setData('mode', mode)}
                                        className="mr-2"
                                    />
                                    <span className="font-semibold">{mode === 'AGREGAR' ? 'Agregar cuotas' : 'Reprogramar'}</span>
                                    <span className="mt-1 block text-xs text-slate-500">
                                        {mode === 'AGREGAR'
                                            ? 'Mantiene las cuotas actuales y agrega las nuevas al final.'
                                            : `Quita ${removedInstallments} cuota(s) sin pagos y conserva ${keptInstallments} con pagos.`}
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                            Número de cuotas
                            <input
                                type="number"
                                min="1"
                                max="360"
                                value={form.data.installments_count}
                                onChange={(event) => form.setData('installments_count', event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                            />
                            <InputError message={form.errors.installments_count} />
                        </label>
                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                            Frecuencia
                            <select
                                value={form.data.frequency}
                                onChange={(event) => form.setData('frequency', event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                            >
                                {frequencies.map((frequency) => (
                                    <option key={frequency} value={frequency}>
                                        {FREQUENCY_LABELS[frequency] ?? frequency}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.frequency} />
                        </label>
                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                            Primera cuota
                            <input
                                type="date"
                                value={form.data.first_due_date}
                                onChange={(event) => form.setData('first_due_date', event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                            />
                            <InputError message={form.errors.first_due_date} />
                        </label>
                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                            Monto a financiar
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder={available.toFixed(2)}
                                value={form.data.financed_amount}
                                onChange={(event) => form.setData('financed_amount', event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                            />
                            <InputError message={form.errors.financed_amount} />
                        </label>
                    </div>
                    <input
                        type="text"
                        placeholder="Notas"
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />

                    <div className="rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-500">
                            <span>Vista previa · {preview.length} cuotas</span>
                            <span>{formatMoney(preview.reduce((total, row) => total + row.amount, 0))}</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                            {preview.length === 0 ? (
                                <p className="px-3 py-3 text-sm text-slate-500">Complete los datos para ver el cronograma.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {preview.map((row) => (
                                            <tr key={row.number}>
                                                <td className="px-3 py-1.5 text-slate-500">Cuota {row.number}</td>
                                                <td className="px-3 py-1.5">{formatDate(row.dueDate)}</td>
                                                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatMoney(row.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={form.processing || preview.length === 0}>
                            Generar cronograma
                        </Button>
                    </DialogFooter>
                </form>
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
                    <DialogDescription>
                        Registre una nueva cuota del cronograma.
                        {lot ? ` Saldo pendiente del lote: ${formatMoney(lot.remaining_balance)}.` : ''}
                    </DialogDescription>
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
                    <div>
                        <input
                            type="date"
                            value={form.data.due_date}
                            onChange={(event) => form.setData('due_date', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                        />
                        <InputError message={form.errors.due_date} />
                    </div>
                    <div>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Monto"
                            value={form.data.amount}
                            onChange={(event) => form.setData('amount', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                        />
                        <InputError message={form.errors.amount} />
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Notas"
                            value={form.data.notes}
                            onChange={(event) => form.setData('notes', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                        />
                        <InputError message={form.errors.notes} />
                    </div>

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
    paymentMethods,
    open,
    onOpenChange,
}: {
    lot: LotItem | null;
    cashAccounts: CashAccount[];
    paymentMethods: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm<{
        lot_installment_id: string;
        cash_account_id: string;
        amount: string;
        paid_at: string;
        payment_method: string;
        reference: string;
        notes: string;
        voucher_image: File | null;
    }>({
        lot_installment_id: '',
        cash_account_id: '',
        amount: '',
        paid_at: todayIsoDate(),
        payment_method: 'TRANSFERENCIA',
        reference: '',
        notes: '',
        voucher_image: null,
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const pendingInstallments = useMemo(() => unpaidInstallmentsOldestFirst(lot?.installments ?? []), [lot]);
    const { allocationPreview, leftoverAmount } = useMemo(() => {
        const amount = Number(form.data.amount);
        const targets = form.data.lot_installment_id
            ? pendingInstallments.filter((installment) => String(installment.id) === form.data.lot_installment_id)
            : pendingInstallments;
        const rows: { sequence: number; amount: number; settles: boolean }[] = [];
        let remainingCents = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;

        for (const installment of targets) {
            if (remainingCents <= 0) {
                break;
            }

            const balanceCents = Math.round(installmentBalance(installment) * 100);
            const appliedCents = Math.min(remainingCents, balanceCents);
            rows.push({ sequence: installment.sequence, amount: appliedCents / 100, settles: appliedCents === balanceCents });
            remainingCents -= appliedCents;
        }

        return { allocationPreview: rows, leftoverAmount: rows.length > 0 ? remainingCents / 100 : 0 };
    }, [form.data.amount, form.data.lot_installment_id, pendingInstallments]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleVoucherChange = (file: File | null) => {
        form.setData('voucher_image', file);

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(file ? URL.createObjectURL(file) : null);
    };

    const resetPaymentForm = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        form.setData({
            lot_installment_id: '',
            cash_account_id: '',
            amount: '',
            paid_at: todayIsoDate(),
            payment_method: 'TRANSFERENCIA',
            reference: '',
            notes: '',
            voucher_image: null,
        });
        form.clearErrors();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    resetPaymentForm();
                }
                onOpenChange(nextOpen);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {lot ? `Registrar abono para ${lot.block}-${lot.number}` : 'Registrar abono'}
                    </DialogTitle>
                    <DialogDescription>
                        El abono puede asociarse a una cuota específica y no puede superar el saldo pendiente.
                        {lot ? ` Saldo del lote: ${formatMoney(lot.remaining_balance)}.` : ''}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (!lot) {
                            return;
                        }

                        form.post(`/inmopro/lots/${lot.id}/payments`, {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                resetPaymentForm();
                                onOpenChange(false);
                            },
                        });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <select
                            value={form.data.lot_installment_id}
                            onChange={(event) => form.setData('lot_installment_id', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                        >
                            <option value="">
                                {pendingInstallments.length > 0 ? 'Aplicar a las cuotas más antiguas' : 'Abono al saldo (sin cronograma)'}
                            </option>
                            {pendingInstallments
                                .filter((installment) => installment.status !== 'PAGADA')
                                .map((installment) => (
                                    <option key={installment.id} value={installment.id}>
                                        Cuota {installment.sequence} · {INSTALLMENT_STATUS_LABELS[installment.status] ?? installment.status} · saldo{' '}
                                        {formatMoney(installmentBalance(installment))}
                                    </option>
                                ))}
                        </select>
                        <InputError message={form.errors.lot_installment_id} />
                    </div>

                    <div>
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
                        <InputError message={form.errors.cash_account_id} />
                    </div>

                    <div>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Monto"
                            value={form.data.amount}
                            onChange={(event) => form.setData('amount', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                        />
                        <InputError message={form.errors.amount} />
                        {allocationPreview.length > 0 ? (
                            <ul className="mt-2 space-y-0.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                {allocationPreview.map((row) => (
                                    <li key={row.sequence} className="flex justify-between">
                                        <span>
                                            Cuota {row.sequence}
                                            {row.settles ? ' · queda pagada' : ' · pago parcial'}
                                        </span>
                                        <span className="font-semibold tabular-nums">{formatMoney(row.amount)}</span>
                                    </li>
                                ))}
                                {leftoverAmount > 0 ? (
                                    <li className="flex justify-between">
                                        <span>Abono al saldo del lote</span>
                                        <span className="font-semibold tabular-nums">{formatMoney(leftoverAmount)}</span>
                                    </li>
                                ) : null}
                            </ul>
                        ) : null}
                    </div>
                    <input
                        type="date"
                        value={form.data.paid_at}
                        onChange={(event) => form.setData('paid_at', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <div>
                        <select
                            value={form.data.payment_method}
                            onChange={(event) => form.setData('payment_method', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                        >
                            {paymentMethods.map((method) => (
                                <option key={method} value={method}>
                                    {PAYMENT_METHOD_LABELS[method] ?? method}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.payment_method} />
                    </div>
                    <input
                        type="text"
                        placeholder="Referencia"
                        value={form.data.reference}
                        onChange={(event) => form.setData('reference', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />

                    <div className="space-y-2">
                        <label
                            htmlFor="lot_payment_voucher"
                            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-slate-400"
                        >
                            <ImagePlus className="h-7 w-7 text-slate-400" />
                            <p className="mt-2 text-sm font-semibold text-slate-700">
                                {form.data.voucher_image ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP. Máximo 5 MB.</p>
                            {form.data.voucher_image ? (
                                <p className="mt-1 truncate text-xs font-semibold text-emerald-700">
                                    {form.data.voucher_image.name}
                                </p>
                            ) : null}
                        </label>
                        <input
                            id="lot_payment_voucher"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                handleVoucherChange(event.target.files?.[0] ?? null);
                            }}
                        />
                        <InputError message={form.errors.voucher_image} />
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Vista previa del comprobante"
                                    className="max-h-44 w-full object-contain"
                                />
                            ) : (
                                <div className="flex min-h-24 items-center justify-center px-4 py-4 text-center text-sm text-slate-500">
                                    Vista previa del comprobante
                                </div>
                            )}
                        </div>
                    </div>

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
