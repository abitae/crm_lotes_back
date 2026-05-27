import { Head, Link } from '@inertiajs/react';
import { BarChart3, FileText, LayoutGrid, Target, TrendingDown, Users } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ReportCard = {
    slug: string;
    title: string;
    description: string;
    route: string;
    filters: string[];
};

const hrefBySlug: Record<string, string> = {
    sales: '/inmopro/reports/sales',
    'top-advisors': '/inmopro/reports/top-advisors',
    reservations: '/inmopro/reports/reservations',
    'contracts-week': '/inmopro/reports/contracts-week',
    'expired-contracts': '/inmopro/reports/expired-contracts',
    'project-inventory': '/inmopro/reports/project-inventory',
    'transfers-by-project': '/inmopro/reports/transfers-by-project',
    'team-goals': '/inmopro/reports/team-goals',
    fallen: '/inmopro/reports/fallen',
};

const iconBySlug: Record<string, typeof BarChart3> = {
    sales: BarChart3,
    'top-advisors': Users,
    reservations: FileText,
    'contracts-week': FileText,
    'expired-contracts': TrendingDown,
    'project-inventory': LayoutGrid,
    'transfers-by-project': BarChart3,
    'team-goals': Target,
    fallen: TrendingDown,
};

export default function ReportsHub({
    reports,
    reportSettingsUrl,
}: {
    reports: ReportCard[];
    reportSettingsUrl: string;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Reportes', href: '/inmopro/reports' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes - Inmopro" />
            <div className="space-y-8 p-4 md:p-6">
                <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl md:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Inteligencia comercial</p>
                    <h1 className="mt-2 text-2xl font-black md:text-3xl">Catálogo de reportes</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-300">
                        Elija un reporte operativo o comercial. Cada uno incluye filtros, exportación PDF y CSV.
                    </p>
                    <Link
                        href={reportSettingsUrl}
                        className="mt-4 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                        Configurar meta general de ventas →
                    </Link>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {reports.map((report) => {
                        const Icon = iconBySlug[report.slug] ?? FileText;
                        const href = hrefBySlug[report.slug] ?? '/inmopro/reports';

                        return (
                            <Link
                                key={report.slug}
                                href={href}
                                className="group rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:border-emerald-500/40 hover:shadow-md"
                            >
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 group-hover:bg-emerald-500/20">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-bold text-foreground">{report.title}</h2>
                                <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
                                <p className="mt-3 text-xs text-slate-500">{report.filters.join(' · ')}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
