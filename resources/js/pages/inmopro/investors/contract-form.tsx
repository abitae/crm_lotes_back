import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { todayIsoDate } from '@/lib/date';
import {
    buildInvestorSchedule,
    formatMoney,
    FREQUENCY_LABELS,
    inputClass,
    isoDate,
    labelClass,
    PAYMENT_MODE_LABELS,
    RATE_PERIOD_LABELS,
    type ScheduleRow,
} from '@/lib/investors';
import type { BreadcrumbItem } from '@/types';

type Option = { id: number; name: string; currency?: string };

type ExistingContract = {
    id: number;
    code: string;
    project_id: number | null;
    currency: string;
    principal_amount: string;
    received_at: string;
    cash_account_id: number | null;
    rate_percent: string;
    rate_period: string;
    payment_mode: string;
    term_months: number;
    installments_count: number;
    frequency: string;
    first_due_date: string;
    withholding_percent: string;
    signed_at: string | null;
    notes: string | null;
    contract_path: string | null;
    installments: Array<{ due_date: string; principal_amount: string; interest_amount: string }>;
};

type ContractFormData = {
    project_id: string;
    currency: string;
    principal_amount: string;
    received_at: string;
    cash_account_id: string;
    rate_percent: string;
    rate_period: string;
    payment_mode: string;
    term_months: string;
    installments_count: string;
    frequency: string;
    first_due_date: string;
    withholding_percent: string;
    signed_at: string;
    notes: string;
    contract_file: File | null;
    installments: ScheduleRow[];
};

function sameSchedule(first: ScheduleRow[], second: ScheduleRow[]): boolean {
    return (
        first.length === second.length &&
        first.every(
            (row, index) =>
                row.due_date === second[index].due_date &&
                Math.round(row.principal_amount * 100) === Math.round(second[index].principal_amount * 100) &&
                Math.round(row.interest_amount * 100) === Math.round(second[index].interest_amount * 100),
        )
    );
}

export default function InvestorContractForm({
    investor,
    contract,
    projects,
    cashAccounts,
    currencies,
    paymentModes,
    ratePeriods,
    frequencies,
}: {
    investor: { id: number; name: string; document_number: string };
    contract: ExistingContract | null;
    projects: Option[];
    cashAccounts: Option[];
    currencies: string[];
    paymentModes: string[];
    ratePeriods: string[];
    frequencies: string[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inversionistas', href: '/inmopro/investors' },
        { title: investor.name, href: `/inmopro/investors/${investor.id}` },
        { title: contract ? `Editar ${contract.code}` : 'Nuevo contrato', href: '#' },
    ];

    const existingRows: ScheduleRow[] = (contract?.installments ?? []).map((row) => ({
        due_date: isoDate(row.due_date),
        principal_amount: Number(row.principal_amount),
        interest_amount: Number(row.interest_amount),
    }));

    const form = useForm<ContractFormData>({
        project_id: contract?.project_id ? String(contract.project_id) : '',
        currency: contract?.currency ?? 'PEN',
        principal_amount: contract ? String(Number(contract.principal_amount)) : '',
        received_at: contract ? isoDate(contract.received_at) : todayIsoDate(),
        cash_account_id: contract?.cash_account_id ? String(contract.cash_account_id) : '',
        rate_percent: contract ? String(Number(contract.rate_percent)) : '',
        rate_period: contract?.rate_period ?? 'ANUAL',
        payment_mode: contract?.payment_mode ?? 'INTERES_PERIODICO',
        term_months: contract ? String(contract.term_months) : '12',
        installments_count: contract ? String(contract.installments_count) : '12',
        frequency: contract?.frequency ?? 'MENSUAL',
        first_due_date: contract ? isoDate(contract.first_due_date) : '',
        withholding_percent: contract ? String(Number(contract.withholding_percent)) : '0',
        signed_at: contract?.signed_at ? isoDate(contract.signed_at) : '',
        notes: contract?.notes ?? '',
        contract_file: null,
        installments: existingRows,
    });

    const { data } = form;

    const generated = useMemo(
        () =>
            buildInvestorSchedule({
                principal_amount: Number(data.principal_amount),
                rate_percent: Number(data.rate_percent),
                rate_period: data.rate_period,
                term_months: Number(data.term_months),
                payment_mode: data.payment_mode,
                installments_count: Number(data.installments_count),
                frequency: data.frequency,
                first_due_date: data.first_due_date,
            }),
        [data.principal_amount, data.rate_percent, data.rate_period, data.term_months, data.payment_mode, data.installments_count, data.frequency, data.first_due_date],
    );

    const [manual, setManual] = useState<boolean>(() => existingRows.length > 0 && !sameSchedule(existingRows, generated));
    const rows = manual ? data.installments : generated;
    const totalPrincipal = rows.reduce((sum, row) => sum + Number(row.principal_amount || 0), 0);
    const totalInterest = rows.reduce((sum, row) => sum + Number(row.interest_amount || 0), 0);
    const principalMismatch = Math.round(totalPrincipal * 100) !== Math.round(Number(data.principal_amount || 0) * 100);
    const availableCash = cashAccounts.filter((account) => !account.currency || account.currency === data.currency);

    const startManual = () => {
        form.setData('installments', generated.map((row) => ({ ...row })));
        setManual(true);
    };

    const updateRow = (index: number, key: keyof ScheduleRow, value: string) => {
        form.setData(
            'installments',
            data.installments.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: key === 'due_date' ? value : Number(value) } : row)),
        );
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform((current) => ({
            ...current,
            installments: manual ? current.installments : [],
            ...(contract ? { _method: 'put' } : {}),
        }));
        form.post(contract ? `/inmopro/investor-contracts/${contract.id}` : `/inmopro/investors/${investor.id}/contracts`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const textField = (name: keyof ContractFormData, label: string, type = 'text', extra: Record<string, string> = {}) => (
        <label className={labelClass}>
            {label}
            <input
                type={type}
                value={String(data[name] ?? '')}
                onChange={(event) => form.setData(name, event.target.value as never)}
                className={inputClass}
                {...extra}
            />
            <InputError message={form.errors[name]} />
        </label>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={contract ? `Editar ${contract.code}` : 'Nuevo contrato de inversión'} />
            <form onSubmit={submit} className="space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white">{contract ? `Editar contrato ${contract.code}` : 'Nuevo contrato de inversión'}</h1>
                    <p className="text-sm text-slate-500">
                        {investor.name} · {investor.document_number}. El contrato se guarda en borrador; al activarlo se registra el ingreso del capital en caja.
                    </p>
                </div>

                <section className="grid gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm md:grid-cols-3">
                    <h2 className="text-sm font-black md:col-span-3">Dinero recibido</h2>
                    <label className={labelClass}>
                        Moneda
                        <select value={data.currency} onChange={(event) => form.setData('currency', event.target.value)} className={inputClass}>
                            {currencies.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)'}
                                </option>
                            ))}
                        </select>
                    </label>
                    {textField('principal_amount', 'Monto prestado', 'number', { step: '0.01', min: '0' })}
                    {textField('received_at', 'Fecha de recepción', 'date')}
                    <label className={labelClass}>
                        Caja donde ingresó
                        <select value={data.cash_account_id} onChange={(event) => form.setData('cash_account_id', event.target.value)} className={inputClass}>
                            <option value="">Elegir al activar</option>
                            {availableCash.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.cash_account_id} />
                    </label>
                    <label className={labelClass}>
                        Proyecto (opcional)
                        <select value={data.project_id} onChange={(event) => form.setData('project_id', event.target.value)} className={inputClass}>
                            <option value="">Sin proyecto</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {textField('signed_at', 'Fecha de firma', 'date')}
                </section>

                <section className="grid gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm md:grid-cols-3">
                    <h2 className="text-sm font-black md:col-span-3">Ganancia y forma de pago</h2>
                    {textField('rate_percent', 'Porcentaje de ganancia (%)', 'number', { step: '0.0001', min: '0' })}
                    <label className={labelClass}>
                        La tasa es
                        <select value={data.rate_period} onChange={(event) => form.setData('rate_period', event.target.value)} className={inputClass}>
                            {ratePeriods.map((period) => (
                                <option key={period} value={period}>
                                    {RATE_PERIOD_LABELS[period] ?? period}
                                </option>
                            ))}
                        </select>
                    </label>
                    {textField('term_months', 'Plazo (meses)', 'number', { min: '1', step: '1' })}
                    <label className={labelClass}>
                        Modalidad de pago
                        <select value={data.payment_mode} onChange={(event) => form.setData('payment_mode', event.target.value)} className={inputClass}>
                            {paymentModes.map((mode) => (
                                <option key={mode} value={mode}>
                                    {PAYMENT_MODE_LABELS[mode] ?? mode}
                                </option>
                            ))}
                        </select>
                    </label>
                    {data.payment_mode !== 'AL_VENCIMIENTO' && textField('installments_count', 'Número de cuotas', 'number', { min: '1', max: '360', step: '1' })}
                    {data.payment_mode !== 'AL_VENCIMIENTO' && (
                        <label className={labelClass}>
                            Frecuencia
                            <select value={data.frequency} onChange={(event) => form.setData('frequency', event.target.value)} className={inputClass}>
                                {frequencies.map((frequency) => (
                                    <option key={frequency} value={frequency}>
                                        {FREQUENCY_LABELS[frequency] ?? frequency}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {textField('first_due_date', data.payment_mode === 'AL_VENCIMIENTO' ? 'Fecha de vencimiento' : 'Fecha del primer pago', 'date')}
                    {textField('withholding_percent', 'Retención sobre intereses (%)', 'number', { step: '0.01', min: '0', max: '100' })}
                    <label className={`${labelClass} md:col-span-3`}>
                        Contrato firmado (PDF o imagen){contract?.contract_path ? ' · ya hay un archivo, suba otro solo para reemplazarlo' : ''}
                        <input type="file" accept=".pdf,image/*" onChange={(event) => form.setData('contract_file', event.target.files?.[0] ?? null)} className={inputClass} />
                        <InputError message={form.errors.contract_file} />
                    </label>
                    <label className={`${labelClass} md:col-span-3`}>
                        Notas
                        <textarea value={data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={2} className={inputClass} />
                    </label>
                </section>

                <section className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-black">Cronograma de pagos</h2>
                            <p className="text-xs text-slate-500">
                                Ganancia {formatMoney(totalInterest, data.currency)} · Total a pagar {formatMoney(totalPrincipal + totalInterest, data.currency)}
                            </p>
                        </div>
                        {manual ? (
                            <Button type="button" variant="outline" onClick={() => setManual(false)}>
                                Volver al cálculo automático
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={startManual} disabled={generated.length === 0}>
                                Editar fechas y montos
                            </Button>
                        )}
                    </div>
                    <InputError message={form.errors.installments} />
                    {manual && principalMismatch && (
                        <p className="text-xs font-semibold text-rose-600">
                            El capital suma {formatMoney(totalPrincipal, data.currency)} y debe ser igual al monto prestado ({formatMoney(data.principal_amount, data.currency)}).
                        </p>
                    )}
                    {rows.length === 0 ? (
                        <p className="text-sm text-slate-500">Complete el monto, la tasa, el plazo y la fecha del primer pago para ver el cronograma.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-[10px] font-bold uppercase text-slate-500">
                                    <tr>
                                        <th className="px-2 py-2">N°</th>
                                        <th className="px-2 py-2">Fecha</th>
                                        <th className="px-2 py-2">Capital</th>
                                        <th className="px-2 py-2">Interés</th>
                                        <th className="px-2 py-2">Total cuota</th>
                                        {manual && <th />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={index} className="border-t border-border">
                                            <td className="px-2 py-1.5">{index + 1}</td>
                                            {manual ? (
                                                <>
                                                    <td className="px-2 py-1.5">
                                                        <input type="date" value={row.due_date} onChange={(event) => updateRow(index, 'due_date', event.target.value)} className={inputClass} />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="number" step="0.01" min="0" value={row.principal_amount} onChange={(event) => updateRow(index, 'principal_amount', event.target.value)} className={inputClass} />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="number" step="0.01" min="0" value={row.interest_amount} onChange={(event) => updateRow(index, 'interest_amount', event.target.value)} className={inputClass} />
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-2 py-1.5">{row.due_date}</td>
                                                    <td className="px-2 py-1.5">{formatMoney(row.principal_amount, data.currency)}</td>
                                                    <td className="px-2 py-1.5">{formatMoney(row.interest_amount, data.currency)}</td>
                                                </>
                                            )}
                                            <td className="px-2 py-1.5 font-semibold">{formatMoney(Number(row.principal_amount || 0) + Number(row.interest_amount || 0), data.currency)}</td>
                                            {manual && (
                                                <td className="px-2 py-1.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Quitar cuota"
                                                        disabled={data.installments.length <= 1}
                                                        onClick={() => form.setData('installments', data.installments.filter((_, rowIndex) => rowIndex !== index))}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {manual && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() =>
                                        form.setData('installments', [
                                            ...data.installments,
                                            { due_date: data.installments.at(-1)?.due_date ?? data.first_due_date, principal_amount: 0, interest_amount: 0 },
                                        ])
                                    }
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar cuota
                                </Button>
                            )}
                        </div>
                    )}
                </section>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild>
                        <Link href={contract ? `/inmopro/investor-contracts/${contract.id}` : `/inmopro/investors/${investor.id}`}>Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing || (manual && principalMismatch)}>
                        {contract ? 'Guardar cambios' : 'Guardar borrador'}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
