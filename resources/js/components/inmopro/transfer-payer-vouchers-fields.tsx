import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPen } from '@/lib/report-utils';

/** Keys must match App\Models\Inmopro\LotTransferVoucher::BANKS. */
export const TRANSFER_BANKS: Array<{ value: string; label: string }> = [
    { value: 'BCP', label: 'BCP' },
    { value: 'BBVA', label: 'BBVA' },
    { value: 'INTERBANK', label: 'Interbank' },
    { value: 'SCOTIABANK', label: 'Scotiabank' },
    { value: 'BANCO_NACION', label: 'Banco de la Nación' },
    { value: 'BANBIF', label: 'BanBif' },
    { value: 'PICHINCHA', label: 'Banco Pichincha' },
    { value: 'CAJA_AREQUIPA', label: 'Caja Arequipa' },
    { value: 'CAJA_HUANCAYO', label: 'Caja Huancayo' },
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'OTRO', label: 'Otro' },
];

export type TransferVoucherInput = {
    image: File | null;
    bank: string;
    bank_other: string;
    amount: string;
    operation_number: string;
};

export type TransferPayerVouchersData = {
    payer_name: string;
    payer_dni: string;
    vouchers: TransferVoucherInput[];
};

export function emptyTransferVoucher(): TransferVoucherInput {
    return {
        image: null,
        bank: '',
        bank_other: '',
        amount: '',
        operation_number: '',
    };
}

export function initialTransferPayerVouchers(
    client?: { name?: string | null; dni?: string | null } | null,
): TransferPayerVouchersData {
    return {
        payer_name: client?.name ?? '',
        payer_dni: client?.dni ?? '',
        vouchers: [emptyTransferVoucher()],
    };
}

function normalize(value?: string | null): string {
    return (value ?? '').trim().toLowerCase();
}

export default function TransferPayerVouchersFields({
    data,
    errors,
    client,
    onChange,
    idPrefix = 'transfer',
}: {
    data: TransferPayerVouchersData;
    errors: Partial<Record<string, string>>;
    client?: { name?: string | null; dni?: string | null } | null;
    onChange: (patch: Partial<TransferPayerVouchersData>) => void;
    idPrefix?: string;
}) {
    const emit = <K extends keyof TransferPayerVouchersData>(
        key: K,
        value: TransferPayerVouchersData[K],
    ) => onChange({ [key]: value } as Partial<TransferPayerVouchersData>);

    const previews = useMemo(
        () =>
            data.vouchers.map((voucher) =>
                voucher.image ? URL.createObjectURL(voucher.image) : null,
            ),
        [data.vouchers],
    );

    useEffect(() => {
        return () => previews.forEach((url) => url && URL.revokeObjectURL(url));
    }, [previews]);

    const payerDiffers = client?.name
        ? data.payer_dni && client.dni
            ? normalize(data.payer_dni) !== normalize(client.dni)
            : normalize(data.payer_name) !== normalize(client.name)
        : false;

    const vouchersTotal = data.vouchers.reduce(
        (sum, voucher) => sum + (Number(voucher.amount) || 0),
        0,
    );

    const updateVoucher = (
        index: number,
        patch: Partial<TransferVoucherInput>,
    ) => {
        emit(
            'vouchers',
            data.vouchers.map((voucher, position) =>
                position === index ? { ...voucher, ...patch } : voucher,
            ),
        );
    };

    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                        Persona que transfiere
                    </p>
                    {payerDiffers ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Distinto al cliente que reservó
                        </span>
                    ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                    <div className="space-y-1">
                        <label
                            htmlFor={`${idPrefix}_payer_name`}
                            className="text-xs font-medium text-slate-700"
                        >
                            Nombre completo
                        </label>
                        <Input
                            id={`${idPrefix}_payer_name`}
                            value={data.payer_name}
                            onChange={(event) =>
                                emit('payer_name', event.target.value)
                            }
                            placeholder="Nombre de quien realiza la transferencia"
                        />
                        <InputError message={errors.payer_name} />
                    </div>
                    <div className="space-y-1">
                        <label
                            htmlFor={`${idPrefix}_payer_dni`}
                            className="text-xs font-medium text-slate-700"
                        >
                            DNI / documento (opcional)
                        </label>
                        <Input
                            id={`${idPrefix}_payer_dni`}
                            value={data.payer_dni}
                            onChange={(event) =>
                                emit('payer_dni', event.target.value)
                            }
                            placeholder="Documento"
                        />
                        <InputError message={errors.payer_dni} />
                    </div>
                </div>
                {client?.name ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                        Cliente que reservó: {client.name}
                        {client.dni ? ` · ${client.dni}` : ''}
                    </p>
                ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-800">
                            Comprobantes
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {data.vouchers.length} comprobante(s) · Suma{' '}
                            {formatPen(vouchersTotal)}
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={data.vouchers.length >= 10}
                        onClick={() =>
                            emit('vouchers', [
                                ...data.vouchers,
                                emptyTransferVoucher(),
                            ])
                        }
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Agregar comprobante
                    </Button>
                </div>
                <InputError message={errors.vouchers} />

                <div className="space-y-3">
                    {data.vouchers.map((voucher, index) => {
                        const fileId = `${idPrefix}_voucher_image_${index}`;
                        const error = (field: string) =>
                            errors[`vouchers.${index}.${field}`];

                        return (
                            <div
                                key={index}
                                className="space-y-2 rounded-md bg-slate-50 p-2"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-slate-600 uppercase">
                                        Comprobante {index + 1}
                                    </p>
                                    {data.vouchers.length > 1 ? (
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600"
                                            onClick={() =>
                                                emit(
                                                    'vouchers',
                                                    data.vouchers.filter(
                                                        (_, position) =>
                                                            position !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Quitar
                                        </button>
                                    ) : null}
                                </div>

                                <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                                    <label
                                        htmlFor={fileId}
                                        className="flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-white transition hover:border-emerald-400"
                                        title="Seleccionar imagen"
                                    >
                                        {previews[index] ? (
                                            <img
                                                src={
                                                    previews[index] ?? undefined
                                                }
                                                alt={`Comprobante ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex flex-col items-center gap-1 text-[10px] text-slate-500">
                                                <ImagePlus className="h-4 w-4 text-emerald-600" />
                                                Imagen
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        id={fileId}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(event) =>
                                            updateVoucher(index, {
                                                image:
                                                    event.target.files?.[0] ??
                                                    null,
                                            })
                                        }
                                    />

                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <select
                                                value={voucher.bank}
                                                onChange={(event) =>
                                                    updateVoucher(index, {
                                                        bank: event.target
                                                            .value,
                                                    })
                                                }
                                                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                                aria-label="Banco"
                                            >
                                                <option value="">Banco…</option>
                                                {TRANSFER_BANKS.map((bank) => (
                                                    <option
                                                        key={bank.value}
                                                        value={bank.value}
                                                    >
                                                        {bank.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError
                                                message={error('bank')}
                                            />
                                        </div>
                                        {voucher.bank === 'OTRO' ? (
                                            <div className="space-y-1">
                                                <Input
                                                    placeholder="Nombre del banco"
                                                    value={voucher.bank_other}
                                                    onChange={(event) =>
                                                        updateVoucher(index, {
                                                            bank_other:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                />
                                                <InputError
                                                    message={error(
                                                        'bank_other',
                                                    )}
                                                />
                                            </div>
                                        ) : null}
                                        <div className="space-y-1">
                                            <Input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                placeholder="Monto"
                                                value={voucher.amount}
                                                onChange={(event) =>
                                                    updateVoucher(index, {
                                                        amount: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={error('amount')}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Input
                                                placeholder="N.º de operación"
                                                value={voucher.operation_number}
                                                onChange={(event) =>
                                                    updateVoucher(index, {
                                                        operation_number:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={error(
                                                    'operation_number',
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <InputError message={error('image')} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
