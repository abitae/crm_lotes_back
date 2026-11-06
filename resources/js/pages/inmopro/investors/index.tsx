import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { InvestorFormDialog } from '@/components/inmopro/investor-form-dialog';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDate, todayIsoDate } from '@/lib/date';
import { formatMoney, INSTALLMENT_STATUS_CLASSES, INSTALLMENT_STATUS_LABELS, inputClass } from '@/lib/investors';
import type { BreadcrumbItem } from '@/types';

type InvestorRow = {
    id: number;
    name: string;
    person_type: string;
    document_type: string;
    document_number: string;
    phone: string | null;
    is_active: boolean;
    contracts_count: number;
    active_contracts_count: number;
    pending_by_currency: Record<string, number>;
    principal_by_currency: Record<string, number>;
    next_due_date: string | null;
    has_overdue: boolean;
};

type CurrencySummary = {
    currency: string;
    capital_outstanding: number;
    interest_outstanding: number;
    pending: number;
    overdue: number;
    next_30_days: number;
};

type UpcomingInstallment = {
    id: number;
    sequence: number;
    due_date: string;
    balance: number;
    status: string;
    contract: { id: number; code: string; currency: string } | null;
    investor: { id: number; name: string } | null;
};

const INVESTORS_URL = '/inmopro/investors';

function moneyByCurrency(values: Record<string, number>): string {
    const entries = Object.entries(values ?? {});

    return entries.length === 0 ? '—' : entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
}

export default function InvestorsIndex({
    investors,
    summary,
    upcoming,
    personTypes,
    documentTypes,
    filters,
}: {
    investors: { data: InvestorRow[]; links: PaginationLink[] };
    summary: CurrencySummary[];
    upcoming: UpcomingInstallment[];
    personTypes: string[];
    documentTypes: string[];
    filters: { search?: string; status?: string };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inversionistas', href: INVESTORS_URL },
    ];
    const [createOpen, setCreateOpen] = useState(false);
    const today = todayIsoDate();
    const overdue = upcoming.filter((installment) => installment.due_date.slice(0, 10) < today);
    const nextDays = upcoming.filter((installment) => installment.due_date.slice(0, 10) >= today);
    const summaries = summary.length > 0 ? summary : [{ currency: 'PEN', capital_outstanding: 0, interest_outstanding: 0, pending: 0, overdue: 0, next_30_days: 0 }];

    const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(INVESTORS_URL, {
            search: (formData.get('search') as string) || undefined,
            status: (formData.get('status') as string) || undefined,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inversionistas - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">Inversionistas</h1>
                        <p className="text-sm text-slate-500">Dinero recibido en préstamo y pagos programados según contrato.</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Nuevo inversionista
                    </Button>
                </div>

                {summaries.map((row) => (
                    <div key={row.currency} className="grid gap-4 md:grid-cols-5">
                        <InmoproMetricCard label={`Capital vigente (${row.currency})`} value={formatMoney(row.capital_outstanding, row.currency)} />
                        <InmoproMetricCard label="Intereses por pagar" value={formatMoney(row.interest_outstanding, row.currency)} tone="blue" />
                        <InmoproMetricCard label="Total por pagar" value={formatMoney(row.pending, row.currency)} tone="amber" />
                        <InmoproMetricCard label="Próximos 30 días" value={formatMoney(row.next_30_days, row.currency)} tone="emerald" />
                        <InmoproMetricCard label="Vencido" value={formatMoney(row.overdue, row.currency)} tone="rose" />
                    </div>
                ))}

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-4 xl:col-span-2">
                        <form onSubmit={handleFilter} className="flex flex-wrap gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
                            <input name="search" defaultValue={filters.search} placeholder="Buscar por nombre, documento o contrato" className={`${inputClass} flex-1`} />
                            <select name="status" defaultValue={filters.status ?? ''} className={`${inputClass} w-auto`}>
                                <option value="">Todos</option>
                                <option value="ACTIVOS">Activos</option>
                                <option value="INACTIVOS">Inactivos</option>
                                <option value="CON_MORA">Con pagos vencidos</option>
                            </select>
                            <Button type="submit" variant="outline">
                                <Search className="h-4 w-4" />
                                Buscar
                            </Button>
                        </form>

                        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3">Inversionista</th>
                                        <th className="px-4 py-3">Contratos</th>
                                        <th className="px-4 py-3">Capital vigente</th>
                                        <th className="px-4 py-3">Por pagar</th>
                                        <th className="px-4 py-3">Próximo pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {investors.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No hay inversionistas registrados.
                                            </td>
                                        </tr>
                                    )}
                                    {investors.data.map((investor) => (
                                        <tr key={investor.id} className="border-t border-border">
                                            <td className="px-4 py-3">
                                                <Link href={`${INVESTORS_URL}/${investor.id}`} className="font-bold text-slate-900 hover:underline dark:text-white">
                                                    {investor.name}
                                                </Link>
                                                <p className="text-xs text-slate-500">
                                                    {investor.document_type} {investor.document_number}
                                                    {!investor.is_active && ' · Inactivo'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {investor.active_contracts_count} vigentes / {investor.contracts_count}
                                            </td>
                                            <td className="px-4 py-3">{moneyByCurrency(investor.principal_by_currency)}</td>
                                            <td className="px-4 py-3 font-semibold">{moneyByCurrency(investor.pending_by_currency)}</td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1">
                                                    {investor.has_overdue && <AlertTriangle className="h-4 w-4 text-rose-600" aria-label="Pagos vencidos" />}
                                                    {investor.next_due_date ? formatDate(investor.next_due_date) : '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination links={investors.links} />
                    </div>

                    <div className="space-y-4">
                        <UpcomingList title="Pagos vencidos" items={overdue} empty="No hay pagos vencidos." />
                        <UpcomingList title="Próximos 30 días" items={nextDays} empty="No hay pagos en los próximos 30 días." />
                    </div>
                </div>
            </div>

            <InvestorFormDialog open={createOpen} onOpenChange={setCreateOpen} personTypes={personTypes} documentTypes={documentTypes} />
        </AppLayout>
    );
}

function UpcomingList({ title, items, empty }: { title: string; items: UpcomingInstallment[]; empty: string }) {
    return (
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-black text-slate-900 dark:text-white">{title}</h2>
            {items.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
            <ul className="space-y-2">
                {items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-2 rounded-2xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                        <div>
                            <Link href={`/inmopro/investor-contracts/${item.contract?.id}`} className="font-bold hover:underline">
                                {item.investor?.name}
                            </Link>
                            <p className="text-xs text-slate-500">
                                {item.contract?.code} · Cuota {item.sequence} · {formatDate(item.due_date)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">{formatMoney(item.balance, item.contract?.currency)}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${INSTALLMENT_STATUS_CLASSES[item.status] ?? ''}`}>
                                {INSTALLMENT_STATUS_LABELS[item.status] ?? item.status}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
