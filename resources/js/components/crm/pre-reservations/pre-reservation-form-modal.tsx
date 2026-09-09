import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import {
    ClientSearchSelect,
    formatClientOption,
    type ClientSearchOption,
} from '@/components/crm/clients/client-search-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatArea, formatMoney } from '@/lib/crm-format';
import preReservations from '@/routes/crm/lots/pre-reservations';

type LotSummary = {
    id: number;
    block: string | null;
    number: string | null;
    area?: number | string | null;
    price: number | string | null;
    project: { id: number; name: string };
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lot: LotSummary;
};

export function PreReservationFormModal({ open, onOpenChange, lot }: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        client_id: '' as number | '',
        project_id: lot.project.id,
        lot_id: lot.id,
        amount: '',
        voucher_image: null as File | null,
        payment_reference: '',
        notes: '',
    });
    const [selectedClient, setSelectedClient] = useState<ClientSearchOption | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setSelectedClient(null);
        setData({
            client_id: '',
            project_id: lot.project.id,
            lot_id: lot.id,
            amount: '',
            voucher_image: null,
            payment_reference: '',
            notes: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, lot.id]);

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

        post(preReservations.store(lot.id).url, {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setSelectedClient(null);
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Pre-reserva · {lot.project.name} Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                    </DialogTitle>
                    <DialogDescription>
                        Elige el comprador a propósito. No se preselecciona ningún cliente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="pr-client_id">Cliente</Label>
                        <div className="mt-1">
                            <ClientSearchSelect
                                id="pr-client_id"
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
                        <Label htmlFor="pr-amount">Monto pagado (S/)</Label>
                        <Input
                            id="pr-amount"
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
                        <Label htmlFor="pr-voucher_image">Voucher de pago (imagen)</Label>
                        <Input
                            id="pr-voucher_image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('voucher_image', e.target.files?.[0] ?? null)}
                            className="mt-1"
                        />
                        <InputError message={errors.voucher_image} />
                    </div>

                    <div>
                        <Label htmlFor="pr-payment_reference">Referencia de pago (opcional)</Label>
                        <Input
                            id="pr-payment_reference"
                            value={data.payment_reference}
                            onChange={(e) => setData('payment_reference', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.payment_reference} />
                    </div>

                    <div>
                        <Label htmlFor="pr-notes">Notas (opcional)</Label>
                        <Input
                            id="pr-notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <PreReservationSummary lot={lot} client={selectedClient} amount={data.amount} />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing || !canSubmit}>
                            {processing && <Spinner />}
                            Registrar pre-reserva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PreReservationSummary({
    lot,
    client,
    amount,
}: {
    lot: LotSummary;
    client: ClientSearchOption | null;
    amount: string;
}) {
    const amountLabel = amount !== '' && Number.isFinite(Number(amount)) ? formatMoney(amount) : '—';

    return (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Resumen antes de registrar</p>
            <dl className="grid gap-1 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Cliente</dt>
                    <dd className="text-right font-medium">
                        {client ? formatClientOption(client) : 'Sin seleccionar'}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lote</dt>
                    <dd className="text-right">
                        {lot.project.name} · Mz. {lot.block ?? '—'} Lt. {lot.number ?? '—'}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Área</dt>
                    <dd className="text-right">{formatArea(lot.area)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Precio del lote</dt>
                    <dd className="text-right">{formatMoney(lot.price)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Monto pagado</dt>
                    <dd className="text-right font-medium">{amountLabel}</dd>
                </div>
            </dl>
        </div>
    );
}
