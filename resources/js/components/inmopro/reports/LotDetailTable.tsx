import { formatDate } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';

export type LotDetailRow = {
    client_phone?: string | null;
    operation_number?: string | null;
    advance?: number;
    price?: number;
    project_name?: string | null;
    block?: string | null;
    number?: string | number | null;
    status_name?: string | null;
    advisor_name?: string | null;
    team_name?: string | null;
    contract_date?: string | null;
    payment_limit_date?: string | null;
    days_overdue?: number | null;
};

export function LotDetailTable({ rows, showAdvance = true }: { rows: LotDetailRow[]; showAdvance?: boolean }) {
    return (
        <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
            <table className="w-full min-w-[960px] text-sm">
                <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-3">Celular</th>
                        <th className="px-3 py-3">N° operación</th>
                        {showAdvance ? <th className="px-3 py-3">Adelanto</th> : null}
                        <th className="px-3 py-3">Monto</th>
                        <th className="px-3 py-3">Proyecto</th>
                        <th className="px-3 py-3">MZ</th>
                        <th className="px-3 py-3">Lote</th>
                        <th className="px-3 py-3">Estado</th>
                        <th className="px-3 py-3">Asesor</th>
                        <th className="px-3 py-3">Grupo</th>
                        <th className="px-3 py-3">F. contrato</th>
                        <th className="px-3 py-3">F. límite</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={showAdvance ? 12 : 11} className="px-4 py-8 text-center text-muted-foreground">
                                Sin registros para los filtros aplicados.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr key={i} className="border-b">
                                <td className="px-3 py-2">{row.client_phone ?? '—'}</td>
                                <td className="px-3 py-2">{row.operation_number ?? '—'}</td>
                                {showAdvance ? <td className="px-3 py-2">{formatPen(row.advance ?? 0)}</td> : null}
                                <td className="px-3 py-2">{formatPen(row.price ?? 0)}</td>
                                <td className="px-3 py-2">{row.project_name ?? '—'}</td>
                                <td className="px-3 py-2">{row.block ?? '—'}</td>
                                <td className="px-3 py-2">{row.number ?? '—'}</td>
                                <td className="px-3 py-2">{row.status_name ?? '—'}</td>
                                <td className="px-3 py-2">{row.advisor_name ?? '—'}</td>
                                <td className="px-3 py-2">{row.team_name ?? '—'}</td>
                                <td className="px-3 py-2">{row.contract_date ? formatDate(row.contract_date) : '—'}</td>
                                <td className="px-3 py-2">{row.payment_limit_date ? formatDate(row.payment_limit_date) : '—'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
