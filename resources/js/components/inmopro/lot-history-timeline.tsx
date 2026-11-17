import { formatDateTime } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';

type StatusRef = {
    id: number;
    name: string;
    code: string;
    color?: string | null;
} | null;

export type LotHistoryEntry = {
    id: number;
    event: string;
    event_label: string;
    from_status?: StatusRef;
    to_status?: StatusRef;
    client_name?: string | null;
    client_dni?: string | null;
    advisor_name?: string | null;
    user_name?: string | null;
    reason?: string | null;
    notes?: string | null;
    meta?: {
        payer_name?: string | null;
        payer_dni?: string | null;
        payer_is_client?: boolean;
        transfer_amount?: string | null;
        vouchers?: Array<{
            id: number;
            bank?: string | null;
            amount?: string | null;
            operation_number?: string | null;
        }>;
        sale?: {
            sale_price?: string | null;
            advance?: string | null;
            contract_number?: string | null;
        } | null;
    } | null;
    created_at: string;
};

const EVENT_TONES: Record<string, string> = {
    VENTA_CAIDA: 'border-red-400 bg-red-50',
    LIBERADO: 'border-orange-400 bg-orange-50',
    PRERESERVA_LIBERADA: 'border-orange-300 bg-orange-50',
    TRANSFERENCIA_RECHAZADA: 'border-red-300 bg-red-50',
    TRANSFERIDO: 'border-slate-500 bg-slate-50',
    RESERVADO: 'border-amber-400 bg-amber-50',
    PRERESERVADO: 'border-sky-400 bg-sky-50',
    CUOTAS: 'border-indigo-400 bg-indigo-50',
};

function StatusPill({ status }: { status?: StatusRef }) {
    if (!status) {
        return <span className="text-slate-400">—</span>;
    }

    return (
        <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: status.color ?? '#94a3b8' }}
        >
            {status.name}
        </span>
    );
}

function money(value?: string | null): string {
    return value == null || value === '' ? '—' : formatPen(Number(value));
}

export default function LotHistoryTimeline({
    entries,
}: {
    entries: LotHistoryEntry[];
}) {
    if (entries.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                Sin movimientos registrados.
            </p>
        );
    }

    return (
        <ol className="space-y-3">
            {entries.map((entry) => (
                <li
                    key={entry.id}
                    className={`rounded-lg border-l-4 px-3 py-2 text-sm ${EVENT_TONES[entry.event] ?? 'border-slate-300 bg-white'}`}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-800">
                            {entry.event_label}
                        </p>
                        <p className="text-xs text-slate-500">
                            {formatDateTime(entry.created_at)} ·{' '}
                            {entry.user_name ?? 'Sistema'}
                        </p>
                    </div>

                    {entry.from_status || entry.to_status ? (
                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                            {entry.from_status ? (
                                <>
                                    <StatusPill status={entry.from_status} />
                                    <span className="text-slate-400">→</span>
                                </>
                            ) : null}
                            <StatusPill status={entry.to_status} />
                        </div>
                    ) : null}

                    {entry.client_name || entry.advisor_name ? (
                        <p className="mt-1 text-xs text-slate-600">
                            Cliente:{' '}
                            <span className="font-semibold">
                                {entry.client_name ?? '—'}
                            </span>
                            {entry.client_dni ? ` (${entry.client_dni})` : ''}
                            {' · '}Asesor:{' '}
                            <span className="font-semibold">
                                {entry.advisor_name ?? '—'}
                            </span>
                        </p>
                    ) : null}

                    {entry.reason ? (
                        <p className="mt-1 text-xs text-slate-700">
                            Motivo: {entry.reason}
                        </p>
                    ) : null}
                    {entry.notes ? (
                        <p className="mt-0.5 text-xs whitespace-pre-wrap text-slate-600">
                            {entry.notes}
                        </p>
                    ) : null}

                    {entry.meta?.payer_name ? (
                        <p className="mt-1 text-xs text-slate-700">
                            Transfiere:{' '}
                            <span className="font-semibold">
                                {entry.meta.payer_name}
                            </span>
                            {entry.meta.payer_dni
                                ? ` (${entry.meta.payer_dni})`
                                : ''}
                            {entry.meta.payer_is_client === false ? (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    Distinto al cliente
                                </span>
                            ) : null}
                            {entry.meta.transfer_amount
                                ? ` · Monto ${money(entry.meta.transfer_amount)}`
                                : ''}
                        </p>
                    ) : null}

                    {entry.meta?.vouchers?.length ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                            {entry.meta.vouchers.map((voucher) => (
                                <li key={voucher.id}>
                                    {voucher.bank ?? '—'} · Op.{' '}
                                    {voucher.operation_number ?? '—'} ·{' '}
                                    {money(voucher.amount)}
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    {entry.meta?.sale ? (
                        <p className="mt-1 text-[11px] text-slate-600">
                            Venta anterior: precio{' '}
                            {money(entry.meta.sale.sale_price)} · adelanto{' '}
                            {money(entry.meta.sale.advance)}
                            {entry.meta.sale.contract_number
                                ? ` · contrato ${entry.meta.sale.contract_number}`
                                : ''}
                        </p>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}
