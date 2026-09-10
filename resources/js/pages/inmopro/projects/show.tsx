import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Download,
    FileText,
    ImageIcon,
    LayoutGrid,
    MapPin,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProjectLocationLink } from '@/components/inmopro/project-location-link';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { confirmToggleProjectActive } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import { ProjectShowHeader } from './project-show-header';
import type { Lot, PageProps, ProjectAsset } from './show-types';
import { toNum } from './show-utils';

const currencyFormatter = new Intl.NumberFormat('es-PE', {
    currency: 'PEN',
    maximumFractionDigits: 0,
    style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 1,
});

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function sumLots(lots: Lot[], field: 'price' | 'remaining_balance'): number {
    return lots.reduce((total, lot) => total + (toNum(lot[field]) ?? 0), 0);
}

function statusCount(lots: Lot[], codes: string[]): number {
    return lots.filter(
        (lot) => lot.status?.code && codes.includes(lot.status.code),
    ).length;
}

function percent(value: number, total: number): number {
    if (total === 0) {
        return 0;
    }

    return Math.round((value / total) * 100);
}

function isLikelyUrl(value?: string | null): boolean {
    return Boolean(value && /^https?:\/\//i.test(value));
}

function googleMapsEmbedUrl(
    location?: string | null,
    mapsUrl?: string | null,
    projectName?: string,
): string | null {
    const source = mapsUrl || location;

    if (!source) {
        return null;
    }
    const fallbackQuery =
        location && !isLikelyUrl(location) ? location : projectName;

    try {
        const url = new URL(source);

        if (
            url.hostname.includes('google.') ||
            url.hostname === 'maps.google.com'
        ) {
            const query =
                url.searchParams.get('query') || url.searchParams.get('q');

            if (query) {
                return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
            }

            if (url.pathname.includes('/maps')) {
                const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);

                if (placeMatch?.[1]) {
                    return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')))}&output=embed`;
                }

                url.searchParams.set('output', 'embed');

                return url.toString();
            }
        }
    } catch {
        // Text locations are handled below.
    }

    if (!isLikelyUrl(source)) {
        return `https://www.google.com/maps?q=${encodeURIComponent(source)}&output=embed`;
    }

    if (fallbackQuery) {
        return `https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`;
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(source)}&output=embed`;
}

function ProjectAssetPanel({
    projectId,
    images,
    documents,
}: {
    projectId: number;
    images: ProjectAsset[];
    documents: ProjectAsset[];
}) {
    const [isOpen, setIsOpen] = useState(false);

    if (images.length === 0 && documents.length === 0) {
        return null;
    }

    const renderAsset = (asset: ProjectAsset) => (
        <div
            key={asset.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f3f3] px-3 py-2.5 dark:bg-slate-900"
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#224583] dark:bg-slate-800 dark:text-sky-300">
                    {asset.kind === 'image' ? (
                        <ImageIcon className="h-5 w-5" />
                    ) : (
                        <FileText className="h-5 w-5" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#001b44] dark:text-slate-100">
                        {asset.title || asset.file_name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {asset.file_name}
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <a
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 transition hover:text-[#001b44] dark:bg-slate-800 dark:text-slate-300 dark:hover:text-sky-300"
                    href={asset.download_url}
                    title="Descargar"
                >
                    <Download className="h-4 w-4" />
                </a>
                <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-rose-600 transition hover:bg-rose-50 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-500/15"
                    onClick={() =>
                        router.delete(
                            `/inmopro/projects/${projectId}/assets/${asset.id}`,
                        )
                    }
                    title="Eliminar"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );

    return (
        <section className="rounded-2xl bg-white p-4 shadow-[0_20px_40px_rgba(0,27,68,0.06)] dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
                        Archivos del proyecto
                    </p>
                    <h2 className="text-lg font-black text-[#001b44] dark:text-slate-100">
                        Material comercial y documentos
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {images.length + documents.length} archivo(s)
                    </p>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#f5f3f3] px-3 py-2 text-xs font-bold text-[#001b44] transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() => setIsOpen((value) => !value)}
                    >
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        {isOpen ? 'Minimizar' : 'Maximizar'}
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-xs font-bold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                            Imágenes
                        </p>
                        {images.length > 0 ? (
                            images.map(renderAsset)
                        ) : (
                            <p className="rounded-xl bg-[#f5f3f3] px-3 py-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                Sin imágenes registradas.
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                            Documentos
                        </p>
                        {documents.length > 0 ? (
                            documents.map(renderAsset)
                        ) : (
                            <p className="rounded-xl bg-[#f5f3f3] px-3 py-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                Sin documentos registrados.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default function ProjectsShow({ project }: PageProps) {
    const lots = project.lots ?? [];
    const images = project.images ?? [];
    const documents = project.documents ?? [];
    const heroImage =
        images.find((asset) => asset.preview_url)?.preview_url ?? null;
    const mapEmbedUrl = googleMapsEmbedUrl(
        project.location,
        project.maps_url,
        project.name,
    );
    const dashboardMetrics = useMemo(() => {
        const totalLots = lots.length;
        const freeLots = statusCount(lots, ['LIBRE']);
        const preReservedLots = statusCount(lots, ['PRERESERVA']);
        const reservedLots = statusCount(lots, ['RESERVADO']);
        const transferredLots = statusCount(lots, ['TRANSFERIDO']);
        const installmentLots = statusCount(lots, ['CUOTAS']);
        const commercialLots = reservedLots + transferredLots + installmentLots;
        const soldLots = transferredLots + installmentLots;
        const portfolioValue = sumLots(lots, 'price');
        const receivableBalance = sumLots(lots, 'remaining_balance');
        const occupancyRate = percent(commercialLots, totalLots);
        const salesProgressRate = percent(soldLots, totalLots);
        const availableRate = percent(freeLots, totalLots);

        return {
            availableRate,
            commercialLots,
            freeLots,
            installmentLots,
            occupancyRate,
            portfolioValue,
            preReservedLots,
            receivableBalance,
            reservedLots,
            salesProgressRate,
            soldLots,
            totalLots,
            transferredLots,
        };
    }, [lots]);

    const handleToggleActive = async () => {
        const activating = !project.is_active;
        if (!(await confirmToggleProjectActive(project.name, activating))) {
            return;
        }
        router.patch(
            `/inmopro/projects/${project.id}/toggle-active`,
            {},
            { preserveScroll: true },
        );
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { href: '/inmopro/dashboard', title: 'Inmopro' },
        { href: '/inmopro/projects', title: 'Proyectos' },
        { href: `/inmopro/projects/${project.id}`, title: project.name },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${project.name} - Inmopro`} />
            <div className="flex min-w-0 flex-col gap-6 bg-[#fbf9f8] p-4 pb-8 md:p-6 md:pb-10 dark:bg-slate-950">
                <ProjectShowHeader
                    project={project}
                    onToggleActive={handleToggleActive}
                />

                <section className="grid gap-6 xl:grid-cols-12">
                    <div className="relative min-h-[380px] min-w-0 overflow-hidden rounded-2xl bg-[#dbd9d9] shadow-[0_20px_40px_rgba(0,27,68,0.06)] xl:col-span-8 dark:bg-slate-900 dark:shadow-none">
                        {mapEmbedUrl ? (
                            <iframe
                                src={mapEmbedUrl}
                                title={`Mapa de ${project.name}`}
                                className="absolute inset-0 h-full w-full border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        ) : heroImage ? (
                            <>
                                <img
                                    src={heroImage}
                                    alt={project.name}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-[#001b44]/15 via-transparent to-[#001b44]/35" />
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(117,248,179,0.45),transparent_28%),linear-gradient(135deg,#d8e2ff_0%,#fbf9f8_45%,#efeded_100%)] dark:bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.22),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
                        )}
                        <div className="absolute top-4 left-4 z-10 rounded-full bg-white/85 px-4 py-2 text-xs font-black text-[#001b44] shadow-[0_20px_40px_rgba(0,27,68,0.10)] backdrop-blur-md dark:bg-slate-950/85 dark:text-slate-100 dark:shadow-none">
                            <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            EN VIVO: ubicación del proyecto
                        </div>
                        <div className="absolute top-1/4 right-5 z-10 hidden rounded-full bg-[#001b44] p-2 text-white shadow-[0_20px_40px_rgba(0,27,68,0.18)] sm:block">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="absolute bottom-5 left-5 z-10 w-[min(22rem,calc(100%-2.5rem))] rounded-2xl bg-[#001b44]/95 p-5 text-white shadow-[0_20px_40px_rgba(0,27,68,0.18)] backdrop-blur-md">
                            <p className="text-xs font-black tracking-[0.22em] text-[#aec6ff] uppercase">
                                Pulso comercial
                            </p>
                            <h2 className="mt-1 text-xl font-black">
                                Resumen de disponibilidad
                            </h2>
                            <div className="mt-4 space-y-3">
                                <div>
                                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                                        <span className="tracking-[0.16em] text-[#aec6ff] uppercase">
                                            Disponibles
                                        </span>
                                        <span className="text-[#75f8b3]">
                                            {dashboardMetrics.availableRate}%
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-emerald-500"
                                            style={{
                                                width: `${dashboardMetrics.availableRate}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                                        <span className="tracking-[0.16em] text-[#aec6ff] uppercase">
                                            Reservados y vendidos
                                        </span>
                                        <span className="text-[#fbbc00]">
                                            {dashboardMetrics.occupancyRate}%
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-[#fbbc00]"
                                            style={{
                                                width: `${dashboardMetrics.occupancyRate}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
                        <div className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#001b44] to-[#002f6c] p-6 text-white shadow-[0_20px_40px_rgba(0,27,68,0.10)]">
                            <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black tracking-[0.22em] text-[#aec6ff] uppercase">
                                        Avance de ventas
                                    </p>
                                    <p className="mt-2 text-5xl font-black">
                                        {dashboardMetrics.salesProgressRate}
                                        <span className="text-lg font-bold">
                                            %
                                        </span>
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-[#aec6ff]">
                                        {dashboardMetrics.soldLots} de{' '}
                                        {dashboardMetrics.totalLots} lotes
                                        transferidos o en cuotas
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white/10 p-3">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-6 flex h-14 items-end gap-1.5">
                                {[
                                    dashboardMetrics.freeLots,
                                    dashboardMetrics.preReservedLots,
                                    dashboardMetrics.reservedLots,
                                    dashboardMetrics.transferredLots,
                                    dashboardMetrics.installmentLots,
                                ].map((value, index) => {
                                    const height = Math.max(
                                        18,
                                        percent(
                                            value,
                                            Math.max(
                                                dashboardMetrics.totalLots,
                                                1,
                                            ),
                                        ) * 1.4,
                                    );

                                    return (
                                        <div
                                            key={`${value}-${index}`}
                                            className="flex-1 rounded-t bg-[#75f8b3]/70"
                                            style={{ height: `${height}%` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex min-h-44 flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_20px_40px_rgba(0,27,68,0.06)] dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                                        Saldo por cobrar
                                    </p>
                                    <p className="mt-2 text-4xl font-black text-[#001b44] dark:text-slate-50">
                                        {formatCurrency(
                                            dashboardMetrics.receivableBalance,
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    <Banknote className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-5 space-y-2">
                                <div className="flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
                                    <span>Valor de cartera</span>
                                    <span className="text-[#001b44] dark:text-slate-100">
                                        {formatCurrency(
                                            dashboardMetrics.portfolioValue,
                                        )}
                                    </span>
                                </div>
                                <svg
                                    className="h-12 w-full"
                                    viewBox="0 0 100 30"
                                    role="img"
                                    aria-label="Tendencia de cartera"
                                >
                                    <path
                                        d="M0 24 Q 14 18, 25 20 T 48 10 T 70 17 T 100 6"
                                        fill="none"
                                        stroke="#006d43"
                                        strokeWidth="2.5"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        ['Lotes totales', dashboardMetrics.totalLots],
                        ['Libres', dashboardMetrics.freeLots],
                        ['Pre-reservas', dashboardMetrics.preReservedLots],
                        ['Reservados', dashboardMetrics.reservedLots],
                        [
                            'Transferidos/cuotas',
                            dashboardMetrics.transferredLots +
                                dashboardMetrics.installmentLots,
                        ],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_rgba(0,27,68,0.04)] dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
                        >
                            <p className="text-xs font-black tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                                {label}
                            </p>
                            <p className="mt-1 text-2xl font-black text-[#001b44] dark:text-slate-50">
                                {numberFormatter.format(Number(value))}
                            </p>
                        </div>
                    ))}
                </section>

                {(project.maps_url || project.location) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-[0_20px_40px_rgba(0,27,68,0.04)] dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                        <MapPin className="h-4 w-4 text-[#224583] dark:text-sky-300" />
                        <span className="font-bold text-[#001b44] dark:text-slate-100">
                            Ubicación:
                        </span>
                        <ProjectLocationLink
                            location={project.location}
                            maps_url={project.maps_url}
                            location_label={project.location_label}
                        />
                    </div>
                )}

                <ProjectAssetPanel
                    projectId={project.id}
                    images={images}
                    documents={documents}
                />

                <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_20px_40px_rgba(0,27,68,0.06)] sm:flex-row sm:items-center sm:justify-between dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                    <div>
                        <p className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
                            Inventario comercial
                        </p>
                        <h2 className="text-lg font-black text-[#001b44] dark:text-slate-50">
                            Lotes del proyecto
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {dashboardMetrics.totalLots} lote(s) ·{' '}
                            {dashboardMetrics.freeLots} libres ·{' '}
                            {dashboardMetrics.reservedLots} reservados ·{' '}
                            {dashboardMetrics.transferredLots +
                                dashboardMetrics.installmentLots}{' '}
                            transferidos/cuotas
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="rounded-xl bg-[#001b44] text-white hover:bg-[#002f6c] dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                        asChild
                    >
                        <Link
                            href={`/inmopro/projects/${project.id}/inventory`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Abrir inventario
                        </Link>
                    </Button>
                </section>
            </div>
        </AppLayout>
    );
}
