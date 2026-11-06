import { Head, Link, useForm } from '@inertiajs/react';
import { Ban, CheckCircle2, Download, FileText, HandCoins, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate, todayIsoDate } from '@/lib/date';
import {
    CONTRACT_STATUS_CLASSES,
    CONTRACT_STATUS_LABELS,
    formatMoney,
    FREQUENCY_LABELS,
    INSTALLMENT_STATUS_CLASSES,
    INSTALLMENT_STATUS_LABELS,
    inputClass,
    labelClass,
    PAYMENT_METHOD_LABELS,
    PAYMENT_MODE_LABELS,
    RATE_PERIOD_LABELS,
} from '@/lib/investors';
import type { BreadcrumbItem } from '@/types';

type Installment = {
    id: number;
    sequence: number;
    due_date: string;
    principal_amount: string;
    interest_amount: string;
    amount: string;
    paid_amount: string;
    status: string;
};

type Payment = {
    id: number;
    amount: string;
    withholding_amount: string;
    net_amount: string;
    paid_at: string;
    payment_method: string;
    reference: string | null;
    notes: string | null;
    cash_account: { id: number; name: string } | null;
    allocations: Array<{ id: number; amount: string; interest_amount: string; principal_amount: string; installment: { id: number; sequence: number } | null }>;
};

type CashEntry = {
    id: number;
    type: string;
    concept: string;
    amount: string;
    entry_date: string;
    notes: string | null;
    cash_account: { id: number; name: string } | null;
};

type Contract = {
    id: number;
    code: string;
    status: string;
    currency: string;
    principal_amount: string;
    received_at: string;
    rate_percent: string;
    rate_period: string;
    payment_mode: string;
    term_months: number;
    installments_count: number;
    frequency: string;
    withholding_percent: string;
    total_interest: string;
    total_payable: string;
    signed_at: string | null;
    void_reason: string | null;
    notes: string | null;
    cash_account_id: number | null;
    has_document: boolean;
    outstanding: number;
    paid_amount: number;
    withheld_amount: number;
    investor: { id: number; name: string; bank_name: string | null; bank_account: string | null; bank_cci: string | null };
    project: { id: number; name: string } | null;
    cash_account: { id: number; name: string; currency: string } | null;
    installments: Installment[];
    payments: Payment[];
    cash_entries: CashEntry[];
};

type CashOption = { id: number; name: string; currency: string; current_balance: string };

function installmentBalance(installment: Installment): number {
    return Math.max(0, Number(installment.amount) - Number(installment.paid_amount));
}

export default function InvestorContractShow({ contract, cashAccounts, paymentMethods }: { contract: Contract; cashAccounts: CashOption[]; paymentMethods: string[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inversionistas', href: '/inmopro/investors' },
        { title: contract.investor.name, href: `/inmopro/investors/${contract.investor.id}` },
        { title: contract.code, href: `/inmopro/investor-contracts/${contract.id}` },
    ];
    const [activateOpen, setActivateOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [voidPayment, setVoidPayment] = useState<Payment | null>(null);
    const money = (value: number | string | null | undefined) => formatMoney(value, contract.currency);
    const isDraft = contract.status === 'BORRADOR';
    const isActive = contract.status === 'VIGENTE';
    const canVoid = (isDraft || isActive) && contract.payments.length === 0;

    const terms: Array<[string, string]> = [
        ['Capital recibido', money(contract.principal_amount)],
        ['Fecha de recepción', formatDate(contract.received_at)],
        ['Tasa', `${Number(contract.rate_percent)}% ${(RATE_PERIOD_LABELS[contract.rate_period] ?? '').toLowerCase()}`],
        ['Plazo', `${contract.term_months} meses`],
        ['Modalidad', PAYMENT_MODE_LABELS[contract.payment_mode] ?? contract.payment_mode],
        ['Cuotas', `${contract.installments_count} · ${FREQUENCY_LABELS[contract.frequency] ?? contract.frequency}`],
        ['Retención sobre intereses', `${Number(contract.withholding_percent)}%`],
        ['Caja', contract.cash_account?.name ?? 'Sin asignar'],
        ['Proyecto', contract.project?.name ?? '—'],
        ['Firma', contract.signed_at ? formatDate(contract.signed_at) : '—'],
        ['Cuenta del inversionista', [contract.investor.bank_name, contract.investor.bank_account].filter(Boolean).join(' ') || '—'],
        ['CCI', contract.investor.bank_cci ?? '—'],
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${contract.code} - Inversionistas`} />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white">Contrato {contract.code}</h1>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${CONTRACT_STATUS_CLASSES[contract.status] ?? ''}`}>
                                {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                            </span>
                        </div>
                        <Link href={`/inmopro/investors/${contract.investor.id}`} className="text-sm text-slate-500 hover:underline">
                            {contract.investor.name}
                        </Link>
                        {contract.void_reason && <p className="text-xs text-rose-600">Motivo de anulación: {contract.void_reason}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {contract.has_document && (
                            <Button variant="outline" asChild>
                                <a href={`/inmopro/investor-contracts/${contract.id}/document`} target="_blank" rel="noreferrer">
                                    <FileText className="h-4 w-4" />
                                    Ver contrato
                                </a>
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <a href={`/inmopro/investor-contracts/${contract.id}/export`}>
                                <Download className="h-4 w-4" />
                                Excel
                            </a>
                        </Button>
                        {isDraft && (
                            <Button variant="outline" asChild>
                                <Link href={`/inmopro/investor-contracts/${contract.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                </Link>
                            </Button>
                        )}
                        {isDraft && (
                            <Button onClick={() => setActivateOpen(true)}>
                                <CheckCircle2 className="h-4 w-4" />
                                Activar contrato
                            </Button>
                        )}
                        {isActive && (
                            <Button onClick={() => setPaymentOpen(true)}>
                                <HandCoins className="h-4 w-4" />
                                Registrar pago
                            </Button>
                        )}
                        {canVoid && (
                            <Button variant="outline" className="text-rose-600" onClick={() => setVoidOpen(true)}>
                                <Ban className="h-4 w-4" />
                                Anular
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <InmoproMetricCard label="Total a pagar" value={money(contract.total_payable)} />
                    <InmoproMetricCard label="Ganancia pactada" value={money(contract.total_interest)} tone="blue" />
                    <InmoproMetricCard label="Pagado" value={money(contract.paid_amount)} tone="emerald" />
                    <InmoproMetricCard label="Saldo por pagar" value={money(contract.outstanding)} tone="amber" />
                </div>

                <div className="grid gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                    {terms.map(([label, value]) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                        </div>
                    ))}
                    {contract.withheld_amount > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-500">Retenido a la fecha</p>
                            <p className="text-sm font-semibold">{money(contract.withheld_amount)}</p>
                        </div>
                    )}
                </div>

                <section className="overflow-x-auto rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <h2 className="mb-3 text-sm font-black">Cronograma</h2>
                    <table className="w-full text-sm">
                        <thead className="text-left text-[10px] font-bold uppercase text-slate-500">
                            <tr>
                                <th className="px-2 py-2">N°</th>
                                <th className="px-2 py-2">Vencimiento</th>
                                <th className="px-2 py-2">Capital</th>
                                <th className="px-2 py-2">Interés</th>
                                <th className="px-2 py-2">Cuota</th>
                                <th className="px-2 py-2">Pagado</th>
                                <th className="px-2 py-2">Saldo</th>
                                <th className="px-2 py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contract.installments.map((installment) => (
                                <tr key={installment.id} className="border-t border-border">
                                    <td className="px-2 py-2">{installment.sequence}</td>
                                    <td className="px-2 py-2">{formatDate(installment.due_date)}</td>
                                    <td className="px-2 py-2">{money(installment.principal_amount)}</td>
                                    <td className="px-2 py-2">{money(installment.interest_amount)}</td>
                                    <td className="px-2 py-2 font-semibold">{money(installment.amount)}</td>
                                    <td className="px-2 py-2">{money(installment.paid_amount)}</td>
                                    <td className="px-2 py-2">{money(installmentBalance(installment))}</td>
                                    <td className="px-2 py-2">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${INSTALLMENT_STATUS_CLASSES[installment.status] ?? ''}`}>
                                            {INSTALLMENT_STATUS_LABELS[installment.status] ?? installment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <h2 className="mb-3 text-sm font-black">Pagos realizados</h2>
                        {contract.payments.length === 0 && <p className="text-sm text-slate-500">Aún no hay pagos registrados.</p>}
                        <ul className="space-y-2">
                            {contract.payments.map((payment) => (
                                <li key={payment.id} className="rounded-2xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-bold">{money(payment.amount)}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatDate(payment.paid_at)} · {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method} · {payment.cash_account?.name}
                                                {payment.reference && ` · Ref. ${payment.reference}`}
                                            </p>
                                            {Number(payment.withholding_amount) > 0 && (
                                                <p className="text-xs text-slate-500">
                                                    Retención {money(payment.withholding_amount)} · Neto pagado {money(payment.net_amount)}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-500">
                                                {payment.allocations
                                                    .map((allocation) => `Cuota ${allocation.installment?.sequence ?? '?'}: ${money(allocation.amount)}`)
                                                    .join(' · ')}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <a href={`/inmopro/investor-payments/${payment.id}/voucher`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">
                                                Comprobante
                                            </a>
                                            {contract.status !== 'ANULADO' && (
                                                <button type="button" onClick={() => setVoidPayment(payment)} className="text-xs font-bold text-rose-600 hover:underline">
                                                    Anular
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <h2 className="mb-3 text-sm font-black">Movimientos de caja</h2>
                        {contract.cash_entries.length === 0 && <p className="text-sm text-slate-500">Se registrarán al activar el contrato y al pagar.</p>}
                        <ul className="space-y-2">
                            {contract.cash_entries.map((entry) => (
                                <li key={entry.id} className="flex items-start justify-between gap-2 rounded-2xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                                    <div>
                                        <p className="font-semibold">{entry.concept}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(entry.entry_date)} · {entry.cash_account?.name}
                                            {entry.notes && ` · ${entry.notes}`}
                                        </p>
                                    </div>
                                    <p className={`font-bold ${entry.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {entry.type === 'INGRESO' ? '+' : '−'} {money(entry.amount)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                {contract.notes && (
                    <div className="rounded-3xl border border-border bg-card p-6 text-sm shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Notas</p>
                        <p className="whitespace-pre-line">{contract.notes}</p>
                    </div>
                )}
            </div>

            <ActivateDialog open={activateOpen} onOpenChange={setActivateOpen} contract={contract} cashAccounts={cashAccounts} />
            <ReasonDialog
                open={voidOpen}
                onOpenChange={setVoidOpen}
                title="Anular contrato"
                description={isActive ? 'Se registrará un egreso en caja que revierte el capital recibido.' : 'El borrador quedará anulado.'}
                url={`/inmopro/investor-contracts/${contract.id}/void`}
                method="post"
            />
            <ReasonDialog
                open={voidPayment !== null}
                onOpenChange={(open) => !open && setVoidPayment(null)}
                title="Anular pago"
                description={voidPayment ? `Se revertirán las cuotas y se devolverán ${money(voidPayment.net_amount)} a la caja ${voidPayment.cash_account?.name ?? ''}.` : ''}
                url={voidPayment ? `/inmopro/investor-payments/${voidPayment.id}` : ''}
                method="delete"
            />
            <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} contract={contract} cashAccounts={cashAccounts} paymentMethods={paymentMethods} />
        </AppLayout>
    );
}

function ActivateDialog({ open, onOpenChange, contract, cashAccounts }: { open: boolean; onOpenChange: (open: boolean) => void; contract: Contract; cashAccounts: CashOption[] }) {
    const form = useForm({ cash_account_id: contract.cash_account_id ? String(contract.cash_account_id) : '' });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Activar contrato</DialogTitle>
                    <DialogDescription>
                        Se registrará el ingreso de {formatMoney(contract.principal_amount, contract.currency)} en la caja elegida. Después el cronograma ya no se podrá editar.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(`/inmopro/investor-contracts/${contract.id}/activate`, { preserveScroll: true, onSuccess: () => onOpenChange(false) });
                    }}
                    className="space-y-3"
                >
                    <label className={labelClass}>
                        Caja donde ingresó el dinero ({contract.currency})
                        <select value={form.data.cash_account_id} onChange={(event) => form.setData('cash_account_id', event.target.value)} className={inputClass}>
                            <option value="">Seleccione una caja</option>
                            {cashAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.cash_account_id} />
                        <InputError message={(form.errors as Record<string, string>).status} />
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing || !form.data.cash_account_id}>
                            Activar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ReasonDialog({
    open,
    onOpenChange,
    title,
    description,
    url,
    method,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    url: string;
    method: 'post' | 'delete';
}) {
    const form = useForm({ reason: '' });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        };

        if (method === 'delete') {
            form.delete(url, options);
        } else {
            form.post(url, options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                    <label className={labelClass}>
                        Motivo
                        <textarea value={form.data.reason} onChange={(event) => form.setData('reason', event.target.value)} rows={3} className={inputClass} />
                        <InputError message={form.errors.reason} />
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={form.processing}>
                            Anular
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PaymentDialog({
    open,
    onOpenChange,
    contract,
    cashAccounts,
    paymentMethods,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: Contract;
    cashAccounts: CashOption[];
    paymentMethods: string[];
}) {
    const unpaid = useMemo(
        () =>
            contract.installments
                .filter((installment) => installmentBalance(installment) > 0)
                .sort((first, second) => first.due_date.localeCompare(second.due_date) || first.sequence - second.sequence),
        [contract.installments],
    );
    const form = useForm({
        investor_installment_id: '',
        cash_account_id: contract.cash_account_id ? String(contract.cash_account_id) : '',
        amount: unpaid[0] ? String(installmentBalance(unpaid[0])) : '',
        paid_at: todayIsoDate(),
        payment_method: paymentMethods[0] ?? 'TRANSFERENCIA',
        reference: '',
        notes: '',
        voucher_image: null as File | null,
    });
    const money = (value: number | string) => formatMoney(value, contract.currency);

    const preview = useMemo(() => {
        let remaining = Math.round(Number(form.data.amount || 0) * 100);
        let interestCents = 0;
        const targets = form.data.investor_installment_id ? unpaid.filter((installment) => String(installment.id) === form.data.investor_installment_id) : unpaid;
        const lines: string[] = [];

        for (const installment of targets) {
            if (remaining <= 0) {
                break;
            }

            const balance = Math.round(installmentBalance(installment) * 100);
            const applied = Math.min(remaining, balance);
            const paidCents = Math.round(Number(installment.paid_amount) * 100);
            const interestDue = Math.max(0, Math.round(Number(installment.interest_amount) * 100) - paidCents);
            interestCents += Math.min(applied, interestDue);
            lines.push(`Cuota ${installment.sequence}: ${money(applied / 100)}`);
            remaining -= applied;
        }

        const withholding = Math.round(interestCents * Number(contract.withholding_percent)) / 10000;

        return { lines, withholding, net: Number(form.data.amount || 0) - withholding };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.amount, form.data.investor_installment_id, unpaid, contract.withholding_percent]);

    const selectedCash = cashAccounts.find((account) => String(account.id) === form.data.cash_account_id);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar pago al inversionista</DialogTitle>
                    <DialogDescription>Saldo por pagar: {money(contract.outstanding)}. El pago sale de la caja elegida.</DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(`/inmopro/investor-contracts/${contract.id}/payments`, {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset();
                                onOpenChange(false);
                            },
                        });
                    }}
                    className="grid gap-3 sm:grid-cols-2"
                >
                    <label className={`${labelClass} sm:col-span-2`}>
                        Aplicar a
                        <select value={form.data.investor_installment_id} onChange={(event) => form.setData('investor_installment_id', event.target.value)} className={inputClass}>
                            <option value="">Las cuotas más antiguas</option>
                            {unpaid.map((installment) => (
                                <option key={installment.id} value={installment.id}>
                                    Cuota {installment.sequence} · {formatDate(installment.due_date)} · saldo {money(installmentBalance(installment))}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.investor_installment_id} />
                    </label>
                    <label className={labelClass}>
                        Monto
                        <input type="number" step="0.01" min="0" value={form.data.amount} onChange={(event) => form.setData('amount', event.target.value)} className={inputClass} />
                        <InputError message={form.errors.amount} />
                    </label>
                    <label className={labelClass}>
                        Fecha de pago
                        <input type="date" value={form.data.paid_at} onChange={(event) => form.setData('paid_at', event.target.value)} className={inputClass} />
                        <InputError message={form.errors.paid_at} />
                    </label>
                    <label className={labelClass}>
                        Caja de salida
                        <select value={form.data.cash_account_id} onChange={(event) => form.setData('cash_account_id', event.target.value)} className={inputClass}>
                            <option value="">Seleccione una caja</option>
                            {cashAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name} · saldo {money(account.current_balance)}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.cash_account_id} />
                    </label>
                    <label className={labelClass}>
                        Método
                        <select value={form.data.payment_method} onChange={(event) => form.setData('payment_method', event.target.value)} className={inputClass}>
                            {paymentMethods.map((method) => (
                                <option key={method} value={method}>
                                    {PAYMENT_METHOD_LABELS[method] ?? method}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={labelClass}>
                        Referencia
                        <input value={form.data.reference} onChange={(event) => form.setData('reference', event.target.value)} className={inputClass} />
                    </label>
                    <label className={labelClass}>
                        Comprobante
                        <input type="file" accept="image/*,.pdf" onChange={(event) => form.setData('voucher_image', event.target.files?.[0] ?? null)} className={inputClass} />
                        <InputError message={form.errors.voucher_image} />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>
                        Notas
                        <input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} className={inputClass} />
                    </label>
                    {preview.lines.length > 0 && (
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2 dark:bg-slate-900 dark:text-slate-300">
                            <p className="font-bold">Se aplicará así</p>
                            <p>{preview.lines.join(' · ')}</p>
                            {preview.withholding > 0 && (
                                <p>
                                    Retención {money(preview.withholding)} · Sale de caja {money(preview.net)}
                                </p>
                            )}
                            {selectedCash && Number(selectedCash.current_balance) < preview.net && (
                                <p className="font-bold text-rose-600">La caja no tiene saldo suficiente para este pago.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter className="sm:col-span-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Registrar pago
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
