import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    ClientSearchSelect,
    formatClientOption,
    type ClientSearchOption,
} from '@/components/crm/clients/client-search-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatArea, formatMoney } from '@/lib/crm-format';
import preReservations from '@/routes/crm/lots/pre-reservations';
import type { BreadcrumbItem } from '@/types';

type LotSummary = {
    id: number;
    block: string | null;
    number: string | null;
    area?: number | string | null;
    price: number | string | null;
    project: { id: number; name: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proyectos', href: '/crm/projects' },
    { title: 'Nueva pre-reserva', href: '#' },
];

export default function CrmPreReservationsCreate({ lot }: { lot: LotSummary }) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: '' as number | '',
        project_id: lot.project.id,
        lot_id: lot.id,
        amount: '',
        voucher_image: null as File | null,
        payment_reference: '',
        notes: '',
    });
    const [selectedClient, setSelectedClient] = useState<ClientSearchOption | null>(null);

    const canSubmit =
        data.client_id !== '' &&
        data.amount !== '' &&
        Number(data.amount) > 0 &&
        data.voucher_image !== null;

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (data.client_id === '') {
            return;
        }

        post(preReservations.store(lot.id).url, { forceFormData: true });
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva pre-reserva" />

            <div className="p-6">
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>
                            Pre-reserva · {lot.project.name} Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="client_id">Cliente</Label>
                                <div className="mt-1">
                                    <ClientSearchSelect
                                        id="client_id"
                                        remote
                                        value={data.client_id}
                                        onChange={(next, client) => {
                                            setData('client_id', next);
                                            setSelectedClient(next === '' ? null : (client ?? null));
                                        }}
                                        placeholder="Buscar por nombre, DNI o teléfono…"
                                        required
                                    />
                                </div>
                                <InputError message={errors.client_id} />
                            </div>

                            <div>
                                <Label htmlFor="amount">Monto pagado (S/)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.amount} />
                            </div>

                            <div>
                                <Label htmlFor="voucher_image">Voucher de pago (imagen)</Label>
                                <Input
                                    id="voucher_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setData('voucher_image', e.target.files?.[0] ?? null)}
                                    className="mt-1"
                                />
                                <InputError message={errors.voucher_image} />
                            </div>

                            <div>
                                <Label htmlFor="payment_reference">Referencia de pago (opcional)</Label>
                                <Input
                                    id="payment_reference"
                                    value={data.payment_reference}
                                    onChange={(e) => setData('payment_reference', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.payment_reference} />
                            </div>

                            <div>
                                <Label htmlFor="notes">Notas (opcional)</Label>
                                <Input
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                    Resumen antes de registrar
                                </p>
                                <p>
                                    Cliente:{' '}
                                    <span className="font-medium">
                                        {selectedClient ? formatClientOption(selectedClient) : 'Sin seleccionar'}
                                    </span>
                                </p>
                                <p>
                                    Lote: {lot.project.name} · Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                                </p>
                                <p>Área: {formatArea(lot.area)}</p>
                                <p>Precio del lote: {formatMoney(lot.price)}</p>
                                <p>
                                    Monto pagado:{' '}
                                    {data.amount !== '' && Number.isFinite(Number(data.amount))
                                        ? formatMoney(data.amount)
                                        : '—'}
                                </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing || !canSubmit}>
                                    Registrar pre-reserva
                                </Button>
                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
