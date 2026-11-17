import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import TransferPayerVouchersFields, {
    initialTransferPayerVouchers,
    type TransferVoucherInput,
} from '@/components/inmopro/transfer-payer-vouchers-fields';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { todayIsoDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string;
    number: string;
    price?: string | number | null;
    sale_price?: string | number | null;
    client_name?: string | null;
    client_dni?: string | null;
    project?: { name: string } | null;
    status?: { name: string; code: string } | null;
    client?: {
        name: string;
        dni?: string | null;
        phone?: string | null;
    } | null;
    advisor?: { name: string } | null;
};

export default function TransferConfirmationCreate({ lot }: { lot: Lot }) {
    const defaultAmount = lot.sale_price ?? lot.price;
    const client = {
        name: lot.client?.name ?? lot.client_name ?? null,
        dni: lot.client?.dni ?? lot.client_dni ?? null,
    };
    const { data, setData, post, processing, errors } = useForm<{
        transfer_date: string;
        transfer_amount: string;
        payer_name: string;
        payer_dni: string;
        vouchers: TransferVoucherInput[];
    }>({
        transfer_date: todayIsoDate(),
        transfer_amount:
            defaultAmount == null || defaultAmount === ''
                ? ''
                : String(defaultAmount),
        ...initialTransferPayerVouchers(client),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        {
            title: 'Transferencias',
            href: '/inmopro/lot-transfer-confirmations',
        },
        {
            title: `Lote ${lot.block}-${lot.number}`,
            href: `/inmopro/lots/${lot.id}`,
        },
        {
            title: 'Confirmar transferencia',
            href: `/inmopro/lots/${lot.id}/transfer-confirmation`,
        },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(`/inmopro/lots/${lot.id}/transfer-confirmation`, {
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={`Confirmar transferencia ${lot.block}-${lot.number} - Inmopro`}
            />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">
                        Confirmar transferencia del lote {lot.block}-
                        {lot.number}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Confirme quién realiza la transferencia y adjunte uno o
                        más comprobantes. El lote pasará a estado transferido y
                        quedará pendiente de aprobación.
                    </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm text-slate-500">Proyecto</dt>
                            <dd className="font-medium text-slate-800">
                                {lot.project?.name ?? '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">
                                Estado actual
                            </dt>
                            <dd className="font-medium text-slate-800">
                                {lot.status?.name ?? '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">
                                Cliente que reservó
                            </dt>
                            <dd className="font-medium text-slate-800">
                                {client.name ?? '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">Asesor</dt>
                            <dd className="font-medium text-slate-800">
                                {lot.advisor?.name ?? '—'}
                            </dd>
                        </div>
                    </dl>
                </div>

                <form
                    onSubmit={submit}
                    className="max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="transfer_date">
                                Fecha de transferencia
                            </Label>
                            <Input
                                id="transfer_date"
                                type="date"
                                value={data.transfer_date}
                                onChange={(event) =>
                                    setData('transfer_date', event.target.value)
                                }
                                className="mt-2"
                            />
                            <InputError
                                message={errors.transfer_date}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="transfer_amount">
                                Monto de transferencia
                            </Label>
                            <Input
                                id="transfer_amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.transfer_amount}
                                onChange={(event) =>
                                    setData(
                                        'transfer_amount',
                                        event.target.value,
                                    )
                                }
                                className="mt-2"
                            />
                            <InputError
                                message={errors.transfer_amount}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <TransferPayerVouchersFields
                        idPrefix="page"
                        data={data}
                        errors={errors as Partial<Record<string, string>>}
                        client={client}
                        onChange={(patch) =>
                            setData((previous) => ({ ...previous, ...patch }))
                        }
                    />

                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" disabled={processing}>
                            Registrar transferencia
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={`/inmopro/lots/${lot.id}`}>
                                Cancelar
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
