import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { formatDate, todayIsoDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Entry = {
    id: number;
    type: string;
    concept: string;
    amount: string;
    entry_date: string;
    reference?: string | null;
};

type Account = {
    id: number;
    name: string;
    type: string;
    currency: string;
    initial_balance: string;
    current_balance: string;
    is_active: boolean;
    payments_count: number;
    entries: Entry[];
};

export default function CashAccountsIndex({ accounts }: { accounts: Account[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Caja y bancos', href: '/inmopro/cash-accounts' },
    ];

    const accountForm = useForm({
        name: '',
        type: 'CAJA',
        currency: 'PEN',
        initial_balance: '0',
        is_active: true,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Caja y bancos - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        accountForm.post('/inmopro/cash-accounts', {
                            preserveScroll: true,
                            onSuccess: () => accountForm.reset('name', 'initial_balance'),
                        });
                    }}
                    className="grid gap-3 rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm md:grid-cols-5"
                >
                    <input
                        placeholder="Nombre"
                        value={accountForm.data.name}
                        onChange={(event) => accountForm.setData('name', event.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <select
                        value={accountForm.data.type}
                        onChange={(event) => accountForm.setData('type', event.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    >
                        <option value="CAJA">Caja</option>
                        <option value="BANCO">Banco</option>
                    </select>
                    <input
                        value={accountForm.data.currency}
                        onChange={(event) => accountForm.setData('currency', event.target.value.toUpperCase())}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={accountForm.data.initial_balance}
                        onChange={(event) => accountForm.setData('initial_balance', event.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                        Guardar cuenta
                    </button>
                </form>

                <div className="space-y-6">
                    {accounts.map((account) => (
                        <CashAccountCard key={account.id} account={account} />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}

function CashAccountCard({ account }: { account: Account }) {
    const entryForm = useForm({
        type: 'EGRESO',
        concept: '',
        amount: '',
        entry_date: todayIsoDate(),
        reference: '',
        notes: '',
    });

    return (
        <div className="rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-900">{account.name}</h2>
                    <p className="text-sm text-slate-500">
                        {account.type} · pagos vinculados: {account.payments_count}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Saldo actual</p>
                    <p className="text-2xl font-black text-slate-900">
                        {account.currency} {Number(account.current_balance).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        entryForm.post(`/inmopro/cash-accounts/${account.id}/entries`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                entryForm.reset('concept', 'amount', 'reference', 'notes');
                                entryForm.setData('entry_date', todayIsoDate());
                            },
                        });
                    }}
                    className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                    <h3 className="text-sm font-black uppercase text-slate-700">Nuevo movimiento</h3>
                    <select
                        value={entryForm.data.type}
                        onChange={(event) => entryForm.setData('type', event.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
                    >
                        <option value="INGRESO">Ingreso</option>
                        <option value="EGRESO">Egreso</option>
                    </select>
                    <input
                        placeholder="Concepto"
                        value={entryForm.data.concept}
                        onChange={(event) => entryForm.setData('concept', event.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Monto"
                        value={entryForm.data.amount}
                        onChange={(event) => entryForm.setData('amount', event.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                        type="date"
                        value={entryForm.data.entry_date}
                        onChange={(event) => entryForm.setData('entry_date', event.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
                    />
                    <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">
                        Registrar
                    </button>
                </form>

                <div className="rounded-2xl border border-slate-100 p-4">
                    <h3 className="mb-3 text-sm font-black uppercase text-slate-700">Movimientos recientes</h3>
                    <div className="space-y-2">
                        {account.entries.length === 0 ? (
                            <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
                        ) : (
                            account.entries.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between text-sm">
                                    <span>
                                        {formatDate(entry.entry_date)} · {entry.concept}
                                    </span>
                                    <span className={entry.type === 'EGRESO' ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>
                                        {entry.type === 'EGRESO' ? '-' : '+'}
                                        {account.currency} {Number(entry.amount).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
