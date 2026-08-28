import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { ReportExportActions } from '@/components/inmopro/reports/ReportExportActions';
import AppLayout from '@/layouts/app-layout';
import { inmoproUi } from '@/lib/inmopro-ui';
import type { BreadcrumbItem } from '@/types';

type Props = {
    title: string;
    description: string;
    criteriaNote?: string;
    generatedAt: string;
    exportBaseUrl: string;
    exportQuery?: Record<string, string | number | boolean | null | undefined>;
    exportActions?: ReactNode;
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
};

export function ReportPageShell({
    title,
    description,
    criteriaNote,
    generatedAt,
    exportBaseUrl,
    exportQuery = {},
    exportActions,
    children,
    breadcrumbs,
}: Props) {
    const crumbs: BreadcrumbItem[] = breadcrumbs ?? [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Reportes', href: '/inmopro/reports' },
        { title, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={crumbs}>
            <Head title={`${title} - Reportes`} />
            <div className={inmoproUi.page}>
                <div className={inmoproUi.pageInner}>
                <section className="overflow-hidden rounded-2xl bg-[#001b44] p-6 text-white shadow-[0_24px_60px_rgba(0,27,68,0.18)] md:p-8 dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3 lg:max-w-2xl">
                            <Link
                                href="/inmopro/reports"
                                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver al catálogo
                            </Link>
                            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
                            <p className="text-sm text-slate-300">{description}</p>
                            {criteriaNote ? (
                                <p className="inline-flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                                    {criteriaNote}
                                </p>
                            ) : null}
                            <p className="text-xs text-slate-400">Generado el {generatedAt}</p>
                        </div>
                        {exportActions ?? (
                            <ReportExportActions baseUrl={exportBaseUrl} query={exportQuery} />
                        )}
                    </div>
                </section>
                {children}
                </div>
            </div>
        </AppLayout>
    );
}
