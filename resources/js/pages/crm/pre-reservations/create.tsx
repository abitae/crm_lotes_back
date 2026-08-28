import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import preReservations from '@/routes/crm/lots/pre-reservations';
import type { BreadcrumbItem } from '@/types';

type LotSummary = {
    id: number;
    block: string | null;
    number: string | null;
    price: number | string | null;
    project: { id: number; name: string };
};

type ClientOption = { id: number; name: string; dni: string | null };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proyectos', href: '/crm/projects' },
    { title: 'Nueva pre-reserva', href: '#' },
];

export default function CrmPreReservationsCreate({ lot, clients }: { lot: LotSummary; clients: ClientOption[] }) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: clients[0]?.id ?? '',
        project_id: lot.project.id,
        lot_id: lot.id,
        amount: '',
        voucher_image: null as File | null,
        payment_reference: '',
        notes: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
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
                                <select
                                    id="client_id"
                                    value={data.client_id}
                                    onChange={(e) => setData('client_id', Number(e.target.value))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                                    required
                                >
                                    <option value="">Seleccionar…</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.dni ? `· ${client.dni}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.client_id} />
                            </div>

                            <div>
                                <Label htmlFor="amount">Monto pagado</Label>
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

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
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
