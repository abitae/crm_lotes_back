import { Head, Link, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Image, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { formatDate, formatDateTime } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string;
    number: string;
    area?: string;
    price?: string;
    list_price?: string;
    sale_price?: string;
    acquisition_cost?: string;
    client_name?: string;
    client_dni?: string;
    advance?: string;
    remaining_balance?: string;
    payment_limit_date?: string;
    operation_number?: string;
    contract_date?: string;
    contract_number?: string;
    notarial_transfer_date?: string;
    observations?: string;
    project?: { id: number; name: string };
    status?: { id: number; name: string; code: string; color?: string };
    client?: { id: number; name: string } | null;
    advisor?: { id: number; name: string } | null;
    latest_transfer_confirmation?: {
        id: number;
        status: string;
        evidence_path: string;
        created_at: string;
        reviewed_at?: string | null;
        rejection_reason?: string | null;
        requester?: { name: string } | null;
        reviewer?: { name: string } | null;
    } | null;
    expenses?: Array<{ id: number; category: string; concept: string; amount: string; expense_date: string; notes?: string | null; creator?: { name: string } }>;
};

type FinancialMetrics = { list_price: number; sale_price: number | null; acquisition_cost: number | null; price_variance: number | null; expenses_total: number; commissions_total: number; net_profit: number | null; profit_margin: number | null };

export default function LotsShow({ lot, financialMetrics, canConfirmTransfer, canManageExpenses }: { lot: Lot; financialMetrics: FinancialMetrics; canConfirmTransfer: boolean; canManageFinancials: boolean; canManageExpenses: boolean }) {
    const expenseForm = useForm({ category: 'TRANSFERENCIA', concept: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), notes: '' });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inventario', href: '/inmopro/lots' },
        { title: `Lote ${lot.block}-${lot.number}`, href: `/inmopro/lots/${lot.id}` },
    ];

    const formatMoney = (v: string | undefined) => (v != null && v !== '' ? Number(v).toLocaleString('es') : '—');
    const transferQueueUrl = `/inmopro/lot-transfer-confirmations?search=${encodeURIComponent(`${lot.block}-${lot.number}`)}`;
    const submitExpense = (event: FormEvent) => {
        event.preventDefault();
        expenseForm.post(`/inmopro/lots/${lot.id}/expenses`, { onSuccess: () => expenseForm.reset('concept', 'amount', 'notes') });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lote ${lot.block}-${lot.number} - Inmopro`} />
            <div className="space-y-6 p-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">
                            Lote {lot.block}-{lot.number}
                        </h2>
                        {lot.project && (
                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                <MapPin className="h-4 w-4" />
                                {lot.project.name}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canConfirmTransfer && lot.status?.code === 'RESERVADO' ? (
                            <Button asChild>
                                <Link href={transferQueueUrl}>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Gestionar transferencia
                                </Link>
                            </Button>
                        ) : null}
                        <Link
                            href={`/inmopro/lots/${lot.id}/edit`}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700"
                        >
                            <Pencil className="h-4 w-4" />
                            Editar
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <h3 className="mb-3 font-bold text-slate-700">Identificación</h3>
                            <dl className="space-y-2">
                                <div>
                                    <dt className="text-sm text-slate-500">Estado (Estados de lote)</dt>
                                    <dd>
                                        {lot.status ? (
                                            <span
                                                className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                                style={{ backgroundColor: lot.status.color ?? '#94a3b8' }}
                                            >
                                                {lot.status.name}
                                            </span>
                                        ) : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Área (m²)</dt>
                                    <dd className="font-medium">{lot.area ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Precio de lista</dt>
                                    <dd className="font-medium">S/ {financialMetrics.list_price.toLocaleString('es-PE')}</dd>
                                </div>
                            </dl>
                        </div>
                        <div>
                            <h3 className="mb-3 font-bold text-slate-700">Finanzas / Reserva</h3>
                            <dl className="space-y-2">
                                <div>
                                    <dt className="text-sm text-slate-500">Adelanto - separación</dt>
                                    <dd className="font-medium">{formatMoney(lot.advance)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Monto restante</dt>
                                    <dd className="font-medium">{formatMoney(lot.remaining_balance)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Fecha límite de pago</dt>
                                    <dd className="font-medium">{formatDate(lot.payment_limit_date)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">N° de operación S.</dt>
                                    <dd className="font-medium">{lot.operation_number ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Fecha de contrato</dt>
                                    <dd className="font-medium">{formatDate(lot.contract_date)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Nº de contrato</dt>
                                    <dd className="font-medium">{lot.contract_number ?? '—'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h3 className="mb-3 font-bold text-slate-700">Control de costos y ganancia</h3>
                        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div><dt className="text-sm text-slate-500">Precio real de venta</dt><dd className="font-medium">{financialMetrics.sale_price === null ? 'Pendiente' : `S/ ${financialMetrics.sale_price.toLocaleString('es-PE')}`}</dd></div>
                            <div><dt className="text-sm text-slate-500">Costo base</dt><dd className="font-medium">{financialMetrics.acquisition_cost === null ? 'Pendiente' : `S/ ${financialMetrics.acquisition_cost.toLocaleString('es-PE')}`}</dd></div>
                            <div><dt className="text-sm text-slate-500">Gastos</dt><dd className="font-medium">S/ {financialMetrics.expenses_total.toLocaleString('es-PE')}</dd></div>
                            <div><dt className="text-sm text-slate-500">Comisiones</dt><dd className="font-medium">S/ {financialMetrics.commissions_total.toLocaleString('es-PE')}</dd></div>
                            <div><dt className="text-sm text-slate-500">Variación vs. lista</dt><dd className="font-medium">{financialMetrics.price_variance === null ? '—' : `S/ ${financialMetrics.price_variance.toLocaleString('es-PE')}`}</dd></div>
                            <div><dt className="text-sm text-slate-500">Ganancia neta</dt><dd className="font-bold text-emerald-700">{financialMetrics.net_profit === null ? 'Pendiente de costo base' : `S/ ${financialMetrics.net_profit.toLocaleString('es-PE')}`}</dd></div>
                            <div><dt className="text-sm text-slate-500">Margen</dt><dd className="font-medium">{financialMetrics.profit_margin === null ? '—' : `${financialMetrics.profit_margin}%`}</dd></div>
                        </dl>
                    </div>
                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h3 className="mb-3 font-bold text-slate-700">Movimientos de gasto</h3>
                        <div className="space-y-2">
                            {(lot.expenses ?? []).map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                                    <div><span className="font-semibold">{expense.concept}</span> · {expense.category} · {formatDate(expense.expense_date)}<div className="text-xs text-slate-500">{expense.notes}</div></div>
                                    <div className="flex items-center gap-2"><span className="font-semibold">S/ {Number(expense.amount).toLocaleString('es-PE')}</span>{canManageExpenses ? <button type="button" aria-label="Eliminar gasto" onClick={() => router.delete(`/inmopro/lots/${lot.id}/expenses/${expense.id}`)}><Trash2 className="h-4 w-4 text-red-600" /></button> : null}</div>
                                </div>
                            ))}
                            {(lot.expenses ?? []).length === 0 ? <p className="text-sm text-slate-500">No hay gastos registrados.</p> : null}
                        </div>
                        {canManageExpenses ? (
                            <form onSubmit={submitExpense} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                                <div><Label>Categoría</Label><select value={expenseForm.data.category} onChange={(e) => expenseForm.setData('category', e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="TRANSFERENCIA">Transferencia</option><option value="OTRO">Otro</option></select></div>
                                <div><Label>Concepto</Label><Input value={expenseForm.data.concept} onChange={(e) => expenseForm.setData('concept', e.target.value)} /><InputError message={expenseForm.errors.concept} /></div>
                                <div><Label>Monto</Label><Input type="number" min="0.01" step="0.01" value={expenseForm.data.amount} onChange={(e) => expenseForm.setData('amount', e.target.value)} /><InputError message={expenseForm.errors.amount} /></div>
                                <div><Label>Fecha</Label><Input type="date" value={expenseForm.data.expense_date} onChange={(e) => expenseForm.setData('expense_date', e.target.value)} /><InputError message={expenseForm.errors.expense_date} /></div>
                                <div className="sm:col-span-2"><Label>Observaciones</Label><Input value={expenseForm.data.notes} onChange={(e) => expenseForm.setData('notes', e.target.value)} /></div>
                                <Button type="submit" disabled={expenseForm.processing}>Agregar gasto</Button>
                            </form>
                        ) : null}
                    </div>
                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h3 className="mb-3 font-bold text-slate-700">Asignaciones (solo si se reserva)</h3>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm text-slate-500">Nombre cliente</dt>
                                <dd className="font-medium">
                                    {lot.client ? (
                                        <Link href={`/inmopro/clients/${lot.client.id}`} className="text-emerald-600 hover:underline">
                                            {lot.client_name ?? lot.client.name}
                                        </Link>
                                    ) : (
                                        lot.client_name ?? '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">DNI cliente</dt>
                                <dd className="font-medium">{lot.client_dni ?? '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">Asesor</dt>
                                <dd className="font-medium">
                                    {lot.advisor ? (
                                        <Link href={`/inmopro/advisors/${lot.advisor.id}`} className="text-emerald-600 hover:underline">
                                            {lot.advisor.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </div>
                    {lot.observations && (
                        <div className="mt-6 border-t border-slate-200 pt-6">
                            <h3 className="mb-2 font-bold text-slate-700">Observaciones</h3>
                            <p className="text-slate-600 whitespace-pre-wrap">{lot.observations}</p>
                        </div>
                    )}
                    {lot.latest_transfer_confirmation ? (
                        <div className="mt-6 border-t border-slate-200 pt-6">
                            <h3 className="mb-3 font-bold text-slate-700">Revision de transferencia</h3>
                            <dl className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm text-slate-500">Estado de revision</dt>
                                    <dd className="font-medium">{lot.latest_transfer_confirmation.status}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Registrada</dt>
                                    <dd className="font-medium">{formatDateTime(lot.latest_transfer_confirmation.created_at)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Solicitada por</dt>
                                    <dd className="font-medium">{lot.latest_transfer_confirmation.requester?.name ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-slate-500">Revisada por</dt>
                                    <dd className="font-medium">{lot.latest_transfer_confirmation.reviewer?.name ?? '—'}</dd>
                                </div>
                            </dl>
                            {lot.latest_transfer_confirmation.reviewed_at ? (
                                <p className="mt-3 text-sm text-slate-500">
                                    Revisada: {formatDateTime(lot.latest_transfer_confirmation.reviewed_at)}
                                </p>
                            ) : null}
                            {lot.latest_transfer_confirmation.rejection_reason ? (
                                <p className="mt-2 text-sm text-red-600">{lot.latest_transfer_confirmation.rejection_reason}</p>
                            ) : null}
                            <div className="mt-4">
                                <a
                                    href={`/inmopro/lot-transfer-confirmations/${lot.latest_transfer_confirmation.id}/evidence`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline"
                                >
                                    <Image className="h-4 w-4" />
                                    Ver evidencia
                                </a>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}
