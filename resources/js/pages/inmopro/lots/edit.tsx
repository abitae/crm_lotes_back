import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { todayIsoDate, toIsoDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string;
    number: string;
    area?: string;
    price?: string;
    lot_status_id: number;
    client_id?: number;
    advisor_id?: number;
    client_name?: string;
    client_dni?: string;
    advance?: string;
    remaining_balance?: string;
    payment_limit_date?: string;
    operation_number?: string;
    contract_date?: string;
    contract_number?: string;
    observations?: string;
};
type LotStatus = { id: number; name: string; code: string };
type Client = { id: number; name: string };
type Advisor = { id: number; name: string };
type Project = { id: number; name: string };
type LotEditForm = {
    lot_status_id: number | string;
    client_id: number | '';
    advisor_id: number | '';
    client_name: string;
    client_dni: string;
    advance: string;
    remaining_balance: string;
    payment_limit_date: string;
    operation_number: string;
    contract_date: string;
    contract_number: string;
    observations: string;
};

export default function LotsEdit({ lot, lotStatuses, clients, advisors, projects }: {
    lot: Lot;
    lotStatuses: LotStatus[];
    clients: Client[];
    advisors: Advisor[];
    projects: Project[];
}) {
    const availableLotStatuses = lotStatuses.filter((status) => status.code !== 'TRANSFERIDO' || status.id === lot.lot_status_id);
    const { data, setData, put, processing, errors, transform } = useForm<LotEditForm>({
            lot_status_id: lot.lot_status_id,
            client_id: lot.client_id ?? ('' as number | ''),
            advisor_id: lot.advisor_id ?? ('' as number | ''),
            client_name: lot.client_name ?? '',
            client_dni: lot.client_dni ?? '',
            advance: lot.advance ?? '',
            remaining_balance: lot.remaining_balance ?? '',
            payment_limit_date: toIsoDate(lot.payment_limit_date) || todayIsoDate(),
            operation_number: lot.operation_number ?? '',
            contract_date: toIsoDate(lot.contract_date) || todayIsoDate(),
            contract_number: lot.contract_number ?? '',
            observations: lot.observations ?? '',
        });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inventario', href: '/inmopro/lots' },
        { title: `Editar lote ${lot.block}-${lot.number}`, href: `/inmopro/lots/${lot.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((formData) => ({
            ...formData,
            client_id: formData.client_id === '' ? null : Number(formData.client_id),
            advisor_id: formData.advisor_id === '' ? null : Number(formData.advisor_id),
            advance: formData.advance ? Number(formData.advance) : null,
            remaining_balance: formData.remaining_balance ? Number(formData.remaining_balance) : null,
            payment_limit_date: formData.payment_limit_date || null,
            contract_date: formData.contract_date || null,
            client_name: formData.client_name || null,
            client_dni: formData.client_dni || null,
        }));
        put('/inmopro/lots/' + lot.id);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar lote ${lot.block}-${lot.number} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar Lote {lot.block}-{lot.number}</h2>
                <form onSubmit={submit} className="max-w-2xl space-y-4">
                    <div>
                        <Label htmlFor="lot_status_id">Estado (Estados de lote)</Label>
                        <select id="lot_status_id" value={data.lot_status_id} onChange={(e) => setData('lot_status_id', e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
                            {availableLotStatuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <InputError message={errors.lot_status_id} />
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                        <h3 className="mb-3 text-sm font-bold uppercase text-slate-500">Solo si se reserva</h3>
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="client_id">Cliente</Label>
                                    <select id="client_id" value={data.client_id} onChange={(e) => setData('client_id', e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
                                        <option value="">—</option>
                                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="client_name">Nombre cliente</Label>
                                    <Input id="client_name" value={data.client_name} onChange={(e) => setData('client_name', e.target.value)} className="mt-1" />
                                    <InputError message={errors.client_name} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="client_dni">DNI cliente</Label>
                                    <Input id="client_dni" value={data.client_dni} onChange={(e) => setData('client_dni', e.target.value)} className="mt-1" />
                                    <InputError message={errors.client_dni} />
                                </div>
                                <div>
                                    <Label htmlFor="advisor_id">Asesor</Label>
                                    <select id="advisor_id" value={data.advisor_id} onChange={(e) => setData('advisor_id', e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
                                        <option value="">—</option>
                                        {advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="advance">Adelanto - separación</Label>
                                    <Input id="advance" type="number" min={0} value={data.advance} onChange={(e) => setData('advance', e.target.value)} className="mt-1" />
                                    <InputError message={errors.advance} />
                                </div>
                                <div>
                                    <Label htmlFor="remaining_balance">Monto restante</Label>
                                    <Input id="remaining_balance" type="number" min={0} value={data.remaining_balance} onChange={(e) => setData('remaining_balance', e.target.value)} className="mt-1" />
                                    <InputError message={errors.remaining_balance} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="payment_limit_date">Fecha límite de pago</Label>
                                    <Input id="payment_limit_date" type="date" value={data.payment_limit_date} onChange={(e) => setData('payment_limit_date', e.target.value)} className="mt-1" />
                                    <InputError message={errors.payment_limit_date} />
                                </div>
                                <div>
                                    <Label htmlFor="operation_number">N° de operación S.</Label>
                                    <Input id="operation_number" value={data.operation_number} onChange={(e) => setData('operation_number', e.target.value)} className="mt-1" />
                                    <InputError message={errors.operation_number} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="contract_date">Fecha de contrato</Label>
                                    <Input id="contract_date" type="date" value={data.contract_date} onChange={(e) => setData('contract_date', e.target.value)} className="mt-1" />
                                    <InputError message={errors.contract_date} />
                                </div>
                                <div>
                                    <Label htmlFor="contract_number">Nº de contrato</Label>
                                    <Input id="contract_number" value={data.contract_number} onChange={(e) => setData('contract_number', e.target.value)} className="mt-1" />
                                    <InputError message={errors.contract_number} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="observations">Observaciones</Label>
                        <textarea id="observations" rows={2} value={data.observations} onChange={(e) => setData('observations', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                        <InputError message={errors.observations} />
                    </div>
                    <Button type="submit" disabled={processing}>Actualizar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
