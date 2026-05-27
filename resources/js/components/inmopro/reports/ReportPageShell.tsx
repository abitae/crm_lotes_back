import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { ReportExportActions } from '@/components/inmopro/reports/ReportExportActions';
import type { BreadcrumbItem } from '@/types';

type Props = {
    title: string;
    description: string;
    criteriaNote?: string;
    generatedAt: string;
    exportBaseUrl: string;
    exportQuery?: Record<string, string | number | boolean | null | undefined>;
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
            <div className="space-y-6 p-4 md:p-6">
                <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl md:p-8">
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
                        <ReportExportActions baseUrl={exportBaseUrl} query={exportQuery} />
                    </div>
                </section>
                {children}
            </div>
        </AppLayout>
    );
}
