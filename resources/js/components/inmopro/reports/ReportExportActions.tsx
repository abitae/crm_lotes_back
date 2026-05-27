import { FileDown, FileSpreadsheet } from 'lucide-react';
import { buildQueryString } from '@/lib/report-utils';

type Props = {
    baseUrl: string;
    query?: Record<string, string | number | boolean | null | undefined>;
};

export function ReportExportActions({ baseUrl, query = {} }: Props) {
    const q = buildQueryString(query);
    const suffix = q ? `?${q}` : '';

    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            <a
                href={`${baseUrl}/pdf${suffix}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
            >
                <FileDown className="h-4 w-4" />
                Ver PDF
            </a>
            <a
                href={`${baseUrl}/pdf${suffix}${suffix ? '&' : '?'}disposition=attachment`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/10"
            >
                <FileDown className="h-4 w-4" />
                Descargar PDF
            </a>
            <a
                href={`${baseUrl}/csv${suffix}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/30"
            >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar CSV
            </a>
        </div>
    );
}
