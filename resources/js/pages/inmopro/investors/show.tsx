import { Head, Link } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { InvestorFormDialog, type InvestorFormValues } from '@/components/inmopro/investor-form-dialog';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/date';
import { CONTRACT_STATUS_CLASSES, CONTRACT_STATUS_LABELS, formatMoney, PAYMENT_MODE_LABELS, RATE_PERIOD_LABELS } from '@/lib/investors';
import type { BreadcrumbItem } from '@/types';

type InvestorDetail = Partial<InvestorFormValues> & {
    id: number;
    name: string;
    document_type: string;
    document_number: string;
    client?: { id: number; name: string } | null;
};

type ContractRow = {
    id: number;
    code: string;
    currency: string;
    principal_amount: string;
    rate_percent: string;
    rate_period: string;
    payment_mode: string;
    term_months: number;
    installments_count: number;
    total_interest: string;
    total_payable: string;
    status: string;
    received_at: string;
    project: { id: number; name: string } | null;
    paid_amount: number;
    pending_amount: number;
    progress: number;
    next_due_date: string | null;
};

export default function InvestorShow({
    investor,
    contracts,
    personTypes,
    documentTypes,
}: {
    investor: InvestorDetail;
    contracts: ContractRow[];
    personTypes: string[];
    documentTypes: string[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inversionistas', href: '/inmopro/investors' },
        { title: investor.name, href: `/inmopro/investors/${investor.id}` },
    ];
    const [editOpen, setEditOpen] = useState(false);

    const details: Array<[string, string | null | undefined]> = [
        ['Documento', `${investor.document_type} ${investor.document_number}`],
        ['Teléfono', investor.phone],
        ['Correo', investor.email],
        ['Dirección', investor.address],
        ['Banco', investor.bank_name],
        ['Cuenta', investor.bank_account],
        ['CCI', investor.bank_cci],
        ['Cliente vinculado', investor.client?.name],
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${investor.name} - Inversionistas`} />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">{investor.name}</h1>
                        <p className="text-sm text-slate-500">
                            {investor.person_type === 'JURIDICA' ? 'Persona jurídica' : 'Persona natural'}
                            {investor.is_active === false && ' · Inactivo'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(true)}>
                            <Pencil className="h-4 w-4" />
                            Editar datos
                        </Button>
                        <Button asChild>
                            <Link href={`/inmopro/investors/${investor.id}/contracts/create`}>
                                <Plus className="h-4 w-4" />
                                Nuevo contrato
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                    {details.map(([label, value]) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value || '—'}</p>
                        </div>
                    ))}
                    {investor.notes && (
                        <div className="sm:col-span-2 lg:col-span-4">
                            <p className="text-[10px] font-bold uppercase text-slate-500">Notas</p>
                            <p className="text-sm whitespace-pre-line">{investor.notes}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">Contratos ({contracts.length})</h2>
                    {contracts.length === 0 && (
                        <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-slate-500">
                            Este inversionista aún no tiene contratos. Cree uno por cada préstamo.
                        </p>
                    )}
                    <div className="grid gap-4 lg:grid-cols-2">
                        {contracts.map((contract) => (
                            <Link
                                key={contract.id}
                                href={`/inmopro/investor-contracts/${contract.id}`}
                                className="block rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:border-slate-300"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white">{contract.code}</p>
                                        <p className="text-xs text-slate-500">
                                            Recibido el {formatDate(contract.received_at)}
                                            {contract.project && ` · ${contract.project.name}`}
                                        </p>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${CONTRACT_STATUS_CLASSES[contract.status] ?? ''}`}>
                                        {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                    <p>
                                        <span className="text-slate-500">Capital: </span>
                                        <b>{formatMoney(contract.principal_amount, contract.currency)}</b>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Tasa: </span>
                                        <b>
                                            {Number(contract.rate_percent)}% {RATE_PERIOD_LABELS[contract.rate_period]?.toLowerCase()}
                                        </b>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Ganancia: </span>
                                        <b>{formatMoney(contract.total_interest, contract.currency)}</b>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Plazo: </span>
                                        <b>
                                            {contract.term_months} meses · {contract.installments_count} cuotas
                                        </b>
                                    </p>
                                    <p className="col-span-2 text-xs text-slate-500">{PAYMENT_MODE_LABELS[contract.payment_mode]}</p>
                                </div>
                                <div className="mt-3">
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, contract.progress)}%` }} />
                                    </div>
                                    <p className="mt-1 flex justify-between text-xs text-slate-500">
                                        <span>
                                            Pagado {formatMoney(contract.paid_amount, contract.currency)} de {formatMoney(contract.total_payable, contract.currency)}
                                        </span>
                                        <span>{contract.next_due_date ? `Próximo: ${formatDate(contract.next_due_date)}` : ''}</span>
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <InvestorFormDialog open={editOpen} onOpenChange={setEditOpen} investor={investor} personTypes={personTypes} documentTypes={documentTypes} />
        </AppLayout>
    );
}
