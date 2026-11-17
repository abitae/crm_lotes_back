import { formatPen } from '@/lib/report-utils';

export type TransferVoucher = {
    id: number;
    bank?: string | null;
    bank_label?: string | null;
    amount?: string | number | null;
    operation_number?: string | null;
};

export type TransferWithVouchers = {
    id: number;
    payer_name?: string | null;
    payer_dni?: string | null;
    evidence_path?: string | null;
    vouchers?: TransferVoucher[];
};

export default function TransferVouchersGallery({
    transfer,
    clientName,
    compact = false,
}: {
    transfer: TransferWithVouchers;
    clientName?: string | null;
    compact?: boolean;
}) {
    const vouchers = transfer.vouchers ?? [];
    const payerDiffers =
        !!transfer.payer_name &&
        !!clientName &&
        transfer.payer_name.trim().toLowerCase() !==
            clientName.trim().toLowerCase();

    return (
        <div className="space-y-2">
            {transfer.payer_name ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <span className="text-slate-500">Transfiere: </span>
                    <span className="font-semibold text-slate-800">
                        {transfer.payer_name}
                    </span>
                    {transfer.payer_dni ? (
                        <span className="text-slate-500">
                            {' '}
                            · {transfer.payer_dni}
                        </span>
                    ) : null}
                    {payerDiffers ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Distinto al cliente
                        </span>
                    ) : null}
                </div>
            ) : null}

            {vouchers.length > 0 ? (
                <div
                    className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
                >
                    {vouchers.map((voucher) => {
                        const src = `/inmopro/lot-transfer-vouchers/${voucher.id}/image`;

                        return (
                            <a
                                key={voucher.id}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-emerald-400"
                                title="Abrir comprobante"
                            >
                                <img
                                    src={src}
                                    alt={`Comprobante ${voucher.id}`}
                                    className={`w-full bg-slate-50 object-contain ${compact ? 'h-24' : 'h-32'}`}
                                />
                                <div className="space-y-0.5 px-2 py-1.5 text-[11px]">
                                    <p className="font-semibold text-slate-800">
                                        {voucher.bank_label ??
                                            'Banco no registrado'}
                                    </p>
                                    <p className="text-slate-600">
                                        {voucher.amount != null &&
                                        voucher.amount !== ''
                                            ? formatPen(Number(voucher.amount))
                                            : '—'}
                                    </p>
                                    <p className="truncate text-slate-500">
                                        Op. {voucher.operation_number ?? '—'}
                                    </p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            ) : transfer.evidence_path ? (
                <a
                    href={`/inmopro/lot-transfer-confirmations/${transfer.id}/evidence`}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                    <img
                        src={`/inmopro/lot-transfer-confirmations/${transfer.id}/evidence`}
                        alt={`Evidencia transferencia ${transfer.id}`}
                        className="max-h-36 w-full object-contain sm:max-h-44"
                    />
                </a>
            ) : (
                <p className="text-xs text-slate-500">
                    Sin comprobantes adjuntos.
                </p>
            )}
        </div>
    );
}
