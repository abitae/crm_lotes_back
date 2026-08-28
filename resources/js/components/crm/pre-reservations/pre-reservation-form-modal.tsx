import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
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
import preReservations from '@/routes/crm/lots/pre-reservations';

type LotSummary = {
    id: number;
    block: string | null;
    number: string | null;
    price: number | string | null;
    project: { id: number; name: string };
};

type ClientOption = { id: number; name: string; dni: string | null };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lot: LotSummary;
    clients: ClientOption[];
};

export function PreReservationFormModal({ open, onOpenChange, lot, clients }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
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
        post(preReservations.store(lot.id).url, {
            forceFormData: true,
            onSuccess: () => {
                reset();
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
                    <DialogDescription>Registra el abono inicial y el voucher de pago.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="pr-client_id">Cliente</Label>
                        <select
                            id="pr-client_id"
                            value={data.client_id}
                            onChange={(e) => setData('client_id', Number(e.target.value))}
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
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
                        <Label htmlFor="pr-amount">Monto pagado</Label>
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

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Registrar pre-reserva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
