import { Eye, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { buildQueryString } from '@/lib/report-utils';

type Props = {
    baseUrl: string;
    query?: Record<string, string | number | boolean | null | undefined>;
};

export function TopAdvisorsExportActions({ baseUrl, query = {} }: Props) {
    const [pdfOpen, setPdfOpen] = useState(false);
    const queryString = buildQueryString(query);
    const suffix = queryString ? `?${queryString}` : '';
    const pdfPreviewUrl = `${baseUrl}/pdf${suffix}`;

    return (
        <>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                    type="button"
                    variant="secondary"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15"
                    onClick={() => setPdfOpen(true)}
                >
                    <Eye className="h-4 w-4" />
                    Ver PDF
                </Button>
                <a
                    href={`${baseUrl}/csv${suffix}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/30"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar CSV
                </a>
            </div>

            <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
                <DialogContent className="flex h-[90vh] max-h-[90vh] w-[96vw] max-w-6xl flex-col gap-3 p-4 sm:p-5">
                    <DialogHeader>
                        <DialogTitle>Vista previa del PDF</DialogTitle>
                        <DialogDescription>
                            Reporte horizontal con gráfico de montos transferidos y línea de cantidad de transferencias.
                        </DialogDescription>
                    </DialogHeader>
                    <iframe
                        src={pdfPreviewUrl}
                        title="Vista previa Top cazadores PDF"
                        className="min-h-0 flex-1 rounded-xl border border-slate-200 bg-slate-50"
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
