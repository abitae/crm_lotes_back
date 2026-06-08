import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    ExternalLink,
    FileDown,
    Info,
    MapPin,
    Pencil,
    Ruler,
    Search,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { ProjectLocationLink } from '@/components/inmopro/project-location-link';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/date';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type LotStatus = { id: number; name: string; code: string; color: string };
type Project = {
    id: number;
    name: string;
    blocks: string[];
    location?: string | null;
    maps_url?: string | null;
    location_label?: string | null;
};
type Lot = {
    id: number;
    block: string;
    number: string;
    area: string;
    price: string;
    lot_status_id: number;
    client_id?: number;
    advisor_id?: number;
    client_name?: string;
    client_dni?: string;
    advance?: string;
    remaining_balance?: string;
    payment_limit_date?: string;
    operation_number?: string;
    contract_date?: string;
    contract_number?: string;
    notarial_transfer_date?: string;
    observations?: string;
    status: LotStatus;
    client?: { id: number; name: string };
    advisor?: { id: number; name: string };
};

const currencyFormatter = new Intl.NumberFormat('es-PE', {
    currency: 'PEN',
    maximumFractionDigits: 0,
    style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 1,
});

const compareLotNumbers = (a: string, b: string): number =>
    a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

function formatMoney(value?: string): string {
    if (value == null || value === '') {
        return '—';
    }

    return currencyFormatter.format(Number(value));
}

function formatArea(value?: string): string {
    if (value == null || value === '') {
        return '—';
    }

    return `${numberFormatter.format(Number(value))} m²`;
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
        // Las ubicaciones en texto o coordenadas se resuelven abajo.
    }

    if (!isLikelyUrl(source)) {
        return `https://www.google.com/maps?q=${encodeURIComponent(source)}&output=embed`;
    }

    if (fallbackQuery) {
        return `https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`;
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(source)}&output=embed`;
}

function uniqueBlocks(project: Project, lots: Lot[]): string[] {
    const fromProject = project.blocks ?? [];
    const fromLots = Array.from(new Set(lots.map((lot) => lot.block)));

    return (fromProject.length > 0 ? fromProject : fromLots).sort((a, b) =>
        a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }),
    );
}

export default function Inventory({
    projects,
    project,
    lots,
    lotStatuses,
}: {
    projects: Project[];
    project: Project | null;
    lots: Lot[];
    lotStatuses: LotStatus[];
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const freeCount = lots.filter((lot) => lot.status.code === 'LIBRE').length;
    const preReservedCount = lots.filter(
        (lot) => lot.status.code === 'PRERESERVA',
    ).length;
    const reservedCount = lots.filter(
        (lot) => lot.status.code === 'RESERVADO',
    ).length;
    const transferredCount = lots.filter(
        (lot) => lot.status.code === 'TRANSFERIDO',
    ).length;
    const installmentsCount = lots.filter(
        (lot) => lot.status.code === 'CUOTAS',
    ).length;
    const salesProgress =
        lots.length > 0
            ? Math.round(((transferredCount + installmentsCount) / lots.length) * 100)
            : 0;
    const mapEmbedUrl = project
        ? googleMapsEmbedUrl(project.location, project.maps_url, project.name)
        : null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Inventario', href: '/inmopro/lots' },
    ];

    const filteredLots = lots.filter(
        (lot) =>
            lot.id.toString().includes(searchTerm) ||
            lot.number.toString().includes(searchTerm) ||
            lot.block.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const blockGroups = project
        ? uniqueBlocks(project, filteredLots).map((block) => ({
              block,
              lots: filteredLots
                  .filter((lot) => lot.block === block)
                  .sort((a, b) => compareLotNumbers(a.number, b.number)),
          }))
        : [];

    const openLotSheet = (lot: Lot) => {
        setSelectedLot(lot);
        setDetailModalOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventario - Inmopro" />

            <div className="min-h-full bg-[#fbf9f8] p-4 text-slate-950 md:p-6 dark:bg-slate-950 dark:text-white">
                <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 xl:flex-row">
                    <main className="min-w-0 flex-1 space-y-6">
                        <section className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                            <div className="flex flex-col gap-5 border-b border-slate-100 p-5 md:flex-row md:items-end md:justify-between dark:border-slate-800">
                                <div className="min-w-0">
                                    <p className="text-xs font-black tracking-[0.22em] text-emerald-600 uppercase dark:text-emerald-300">
                                        Inventario comercial
                                    </p>
                                    <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                                        {project?.name ?? 'Seleccione un proyecto'}
                                    </h1>
                                    {project && (
                                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Building2 className="h-4 w-4" />
                                                {project.blocks?.length ?? 0} manzanas
                                            </span>
                                            <span>{lots.length} lotes registrados</span>
                                            {project.maps_url && (
                                                <ProjectLocationLink
                                                    location={project.location}
                                                    maps_url={project.maps_url}
                                                    location_label={
                                                        project.location_label
                                                    }
                                                    className="font-bold text-emerald-700 dark:text-emerald-300"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    {projects.length > 0 && (
                                        <select
                                            value={project?.id ?? ''}
                                            onChange={(event) => {
                                                const id = event.target.value;

                                                router.get(
                                                    '/inmopro/lots',
                                                    id ? { project_id: id } : {},
                                                );
                                            }}
                                            className="min-w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-emerald-500/20"
                                        >
                                            {projects.map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {project && (
                                        <a
                                            href={`/inmopro/lots/export-pdf?project_id=${project.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#001b44] px-4 py-2 text-sm font-black text-white transition hover:bg-[#002f6f] dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                                        >
                                            <FileDown className="h-4 w-4" />
                                            Exportar PDF
                                        </a>
                                    )}
                                </div>
                            </div>

                            {project ? (
                                <div className="space-y-6 p-5">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                                        <InventoryMetric
                                            label="Lotes"
                                            value={String(lots.length)}
                                        />
                                        <InventoryMetric
                                            label="Libres"
                                            value={String(freeCount)}
                                            tone="emerald"
                                        />
                                        <InventoryMetric
                                            label="Pre-reserva"
                                            value={String(preReservedCount)}
                                            tone="sky"
                                        />
                                        <InventoryMetric
                                            label="Reservados"
                                            value={String(reservedCount)}
                                            tone="amber"
                                        />
                                        <InventoryMetric
                                            label="Transferidos"
                                            value={String(transferredCount)}
                                            tone="blue"
                                        />
                                        <InventoryMetric
                                            label="Avance"
                                            value={`${salesProgress}%`}
                                            tone="violet"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="relative min-w-0 flex-1">
                                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por lote o manzana..."
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-500/20"
                                                value={searchTerm}
                                                onChange={(event) =>
                                                    setSearchTerm(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            {lotStatuses.map((status) => (
                                                <div
                                                    key={status.id}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <span
                                                        className="h-3 w-3 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                status.color,
                                                        }}
                                                    />
                                                    <span>{status.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="max-h-[64vh] space-y-8 overflow-y-auto pr-1">
                                        {blockGroups.map(
                                            ({ block, lots: blockLots }) =>
                                                blockLots.length > 0 && (
                                                    <section
                                                        key={block}
                                                        className="space-y-4"
                                                    >
                                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                                                            <div className="rounded-full bg-[#001b44] px-3 py-1 text-xs font-black text-white dark:bg-emerald-500 dark:text-slate-950">
                                                                MANZANA {block}
                                                            </div>
                                                            <span className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                                                                {blockLots.length}{' '}
                                                                lotes
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-2">
                                                            {blockLots.map(
                                                                (lot) => (
                                                                    <button
                                                                        key={
                                                                            lot.id
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openLotSheet(
                                                                                lot,
                                                                            )
                                                                        }
                                                                        className={`aspect-square rounded-lg p-1 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-slate-950 ${
                                                                            selectedLot?.id ===
                                                                            lot.id
                                                                                ? 'ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-950'
                                                                                : ''
                                                                        }`}
                                                                        style={{
                                                                            backgroundColor:
                                                                                lot
                                                                                    .status
                                                                                    .color ||
                                                                                '#64748b',
                                                                        }}
                                                                    >
                                                                        <span className="block text-[11px] font-black leading-none">
                                                                            {
                                                                                lot.number
                                                                            }
                                                                        </span>
                                                                        <span className="mt-1 block truncate text-[8px] font-bold opacity-85">
                                                                            {
                                                                                lot.area
                                                                            }
                                                                            m²
                                                                        </span>
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    </section>
                                                ),
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex min-h-[420px] items-center justify-center p-10 text-center text-slate-500 dark:text-slate-400">
                                    Seleccione un proyecto para ver el inventario.
                                </div>
                            )}
                        </section>
                    </main>

                    <aside className="w-full shrink-0 xl:w-[430px]">
                        <div className="sticky top-6 space-y-5">
                            <ProjectMapCard
                                project={project}
                                mapEmbedUrl={mapEmbedUrl}
                            />

                            <SelectedLotSummary
                                lot={selectedLot}
                                project={project}
                                onOpen={() => setDetailModalOpen(true)}
                            />
                        </div>
                    </aside>
                </div>
            </div>

            <LotDetailDialog
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                lot={selectedLot}
                project={project}
                lotStatuses={lotStatuses}
            />
        </AppLayout>
    );
}

function ProjectMapCard({
    project,
    mapEmbedUrl,
}: {
    project: Project | null;
    mapEmbedUrl: string | null;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex items-start justify-between gap-4 p-5">
                <div>
                    <p className="text-xs font-black tracking-[0.22em] text-emerald-600 uppercase dark:text-emerald-300">
                        Mapa del proyecto
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                        Ubicación en Google Maps
                    </h2>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <MapPin className="h-5 w-5" />
                </div>
            </div>

            <div className="relative mx-5 h-[320px] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950">
                {mapEmbedUrl ? (
                    <iframe
                        src={mapEmbedUrl}
                        title={`Mapa de ${project?.name ?? 'proyecto'}`}
                        className="absolute inset-0 h-full w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <MapPin className="mb-4 h-9 w-9 text-slate-300 dark:text-slate-700" />
                        <p className="font-black text-slate-700 dark:text-slate-200">
                            Sin ubicación registrada
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Agregue coordenadas o una ubicación al proyecto para
                            mostrar el mapa.
                        </p>
                    </div>
                )}
            </div>

            <div className="p-5">
                {project?.maps_url ? (
                    <ProjectLocationLink
                        location={project.location}
                        maps_url={project.maps_url}
                        location_label={project.location_label}
                        className="font-black text-emerald-700 dark:text-emerald-300"
                    />
                ) : (
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        El mapa aparecerá cuando el proyecto tenga ubicación.
                    </p>
                )}
            </div>
        </section>
    );
}

function SelectedLotSummary({
    lot,
    project,
    onOpen,
}: {
    lot: Lot | null;
    project: Project | null;
    onOpen: () => void;
}) {
    if (!lot) {
        return (
            <section className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-950 dark:text-slate-600">
                    <Info className="h-6 w-6" />
                </div>
                <p className="font-black text-slate-800 dark:text-slate-100">
                    Seleccione un lote
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Al presionar un lote se abrirá su ficha completa.
                </p>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div
                className="h-2"
                style={{ backgroundColor: lot.status.color || '#64748b' }}
            />
            <div className="space-y-5 p-5">
                <div>
                    <p className="text-xs font-black tracking-[0.22em] text-slate-400 uppercase dark:text-slate-500">
                        Última ficha consultada
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        Lote {lot.block}-{lot.number}
                    </h3>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {project?.name}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Precio" value={formatMoney(lot.price)} />
                    <MiniStat label="Área" value={formatArea(lot.area)} />
                </div>

                <Button
                    type="button"
                    className="w-full bg-[#001b44] font-black text-white hover:bg-[#002f6f] dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                    onClick={onOpen}
                >
                    Ver ficha
                    <ExternalLink className="h-4 w-4" />
                </Button>
            </div>
        </section>
    );
}

function LotDetailDialog({
    open,
    onOpenChange,
    lot,
    project,
    lotStatuses,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lot: Lot | null;
    project: Project | null;
    lotStatuses: LotStatus[];
}) {
    const status = lotStatuses.find((item) => item.id === lot?.lot_status_id);
    const clientName = lot?.client_name ?? lot?.client?.name ?? null;
    const advisorName = lot?.advisor?.name ?? null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[min(94vh,920px)] w-[min(96vw,80rem)] max-w-none flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 sm:max-w-none dark:border-slate-800 dark:bg-slate-950">
                {lot && (
                    <>
                        <div className="shrink-0 border-b border-slate-100 bg-[#fbf9f8] p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
                            <DialogHeader className="space-y-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-xs font-black tracking-[0.22em] text-emerald-600 uppercase dark:text-emerald-300">
                                            Ficha del lote
                                        </p>
                                        <DialogTitle className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                                            Lote {lot.block}-{lot.number}
                                        </DialogTitle>
                                        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            {project?.name}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
                                            <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                                                Manzana {lot.block}
                                            </span>
                                            <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                                                Lote {lot.number}
                                            </span>
                                            {clientName && (
                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                    Cliente asignado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <span
                                        className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black tracking-wide text-white uppercase"
                                        style={{
                                            backgroundColor:
                                                status?.color ?? '#64748b',
                                        }}
                                    >
                                        {status?.name ?? 'Sin estado'}
                                    </span>
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <FichaMetric
                                    icon={Banknote}
                                    label="Precio"
                                    value={formatMoney(lot.price)}
                                />
                                <FichaMetric
                                    icon={Ruler}
                                    label="Área"
                                    value={formatArea(lot.area)}
                                />
                                <FichaMetric
                                    icon={Banknote}
                                    label="Adelanto"
                                    value={formatMoney(lot.advance)}
                                />
                                <FichaMetric
                                    icon={Banknote}
                                    label="Saldo"
                                    value={formatMoney(lot.remaining_balance)}
                                />
                            </div>

                            <div className="grid gap-5 lg:grid-cols-2">
                                <FichaPanel title="Datos del lote">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <DetailRow label="Proyecto">
                                            {project?.name ?? '—'}
                                        </DetailRow>
                                        <DetailRow label="Estado">
                                            <span
                                                className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-black text-white"
                                                style={{
                                                    backgroundColor:
                                                        status?.color ??
                                                        '#64748b',
                                                }}
                                            >
                                                {status?.name ?? 'Sin estado'}
                                            </span>
                                        </DetailRow>
                                        <DetailRow label="Manzana">
                                            {lot.block}
                                        </DetailRow>
                                        <DetailRow label="Número">
                                            {lot.number}
                                        </DetailRow>
                                        <DetailRow label="Área">
                                            {formatArea(lot.area)}
                                        </DetailRow>
                                        <DetailRow label="Precio">
                                            {formatMoney(lot.price)}
                                        </DetailRow>
                                    </div>
                                </FichaPanel>

                                <FichaPanel title="Resumen comercial">
                                    <div className="space-y-3">
                                        <DetailRow label="Adelanto">
                                            {formatMoney(lot.advance)}
                                        </DetailRow>
                                        <DetailRow label="Saldo por cobrar">
                                            {formatMoney(lot.remaining_balance)}
                                        </DetailRow>
                                        <DetailRow label="Avance">
                                            {Number(lot.price || 0) > 0
                                                ? `${Math.round((Number(lot.advance || 0) / Number(lot.price)) * 100)}% pagado`
                                                : '—'}
                                        </DetailRow>
                                    </div>
                                </FichaPanel>
                            </div>

                            <div className="grid gap-5 lg:grid-cols-2">
                                <FichaPanel title="Cliente y asesor">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <DetailRow label="Cliente">
                                            {lot.client_id || clientName ? (
                                                lot.client?.id ? (
                                                    <Link
                                                        href={`/inmopro/clients/${lot.client.id}`}
                                                        className="font-black text-emerald-700 hover:underline dark:text-emerald-300"
                                                        onClick={() =>
                                                            onOpenChange(false)
                                                        }
                                                    >
                                                        {clientName}
                                                    </Link>
                                                ) : (
                                                    clientName ?? '—'
                                                )
                                            ) : (
                                                '—'
                                            )}
                                        </DetailRow>
                                        <DetailRow label="DNI">
                                            {lot.client_dni ?? '—'}
                                        </DetailRow>
                                        <DetailRow label="Asesor">
                                            {lot.advisor_id &&
                                            lot.advisor?.id ? (
                                                <Link
                                                    href={`/inmopro/advisors/${lot.advisor.id}`}
                                                    className="font-black text-emerald-700 hover:underline dark:text-emerald-300"
                                                    onClick={() =>
                                                        onOpenChange(false)
                                                    }
                                                >
                                                    {advisorName}
                                                </Link>
                                            ) : (
                                                advisorName ?? '—'
                                            )}
                                        </DetailRow>
                                    </div>
                                </FichaPanel>

                                <FichaPanel title="Operación y contrato">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <DetailRow label="Fecha límite de pago">
                                            {formatDate(
                                                lot.payment_limit_date,
                                            )}
                                        </DetailRow>
                                        <DetailRow label="N° operación">
                                            {lot.operation_number ?? '—'}
                                        </DetailRow>
                                        <DetailRow label="Fecha de contrato">
                                            {formatDate(lot.contract_date)}
                                        </DetailRow>
                                        <DetailRow label="N° contrato">
                                            {lot.contract_number ?? '—'}
                                        </DetailRow>
                                        <DetailRow label="Transferencia notarial">
                                            {formatDate(
                                                lot.notarial_transfer_date,
                                            )}
                                        </DetailRow>
                                    </div>
                                </FichaPanel>
                            </div>

                            <FichaPanel title="Observaciones">
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                                    <p className="min-h-24 whitespace-pre-wrap text-sm leading-6 font-medium text-slate-700 dark:text-slate-300">
                                        {lot.observations ||
                                            'Sin observaciones registradas.'}
                                    </p>
                                </div>
                            </FichaPanel>
                        </div>

                        <DialogFooter className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cerrar
                            </Button>
                            <Button
                                asChild
                                className="bg-[#001b44] font-black text-white hover:bg-[#002f6f] dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                            >
                                <Link href={`/inmopro/lots/${lot.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                    Editar lote
                                </Link>
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}


function InventoryMetric({
    label,
    value,
    tone = 'blue',
}: {
    label: string;
    value: string;
    tone?: 'blue' | 'emerald' | 'amber' | 'sky' | 'violet';
}) {
    const tones = {
        blue: 'text-blue-700 dark:text-blue-300',
        emerald: 'text-emerald-700 dark:text-emerald-300',
        sky: 'text-sky-700 dark:text-sky-300',
        amber: 'text-amber-700 dark:text-amber-300',
        violet: 'text-violet-700 dark:text-violet-300',
    };

    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                {label}
            </p>
            <p className={`mt-2 text-2xl font-black ${tones[tone]}`}>
                {value}
            </p>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500">
                {label}
            </p>
            <p className="mt-1 text-base font-black text-slate-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}

function FichaMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-[10rem] rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300">
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                {label}
            </p>
            <p className="mt-2 text-xl font-black break-words text-slate-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}

function FichaPanel({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
                <UserRound className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                {title}
            </h3>
            <div className="min-w-0 space-y-3">{children}</div>
        </section>
    );
}

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(7.5rem,9.5rem)_minmax(0,1fr)] sm:items-center sm:gap-4 dark:bg-slate-950">
            <dt className="shrink-0 text-xs font-black tracking-wide text-slate-400 uppercase dark:text-slate-500">
                {label}
            </dt>
            <dd className="min-w-0 text-sm font-bold break-words text-slate-800 dark:text-slate-100">
                {children}
            </dd>
        </div>
    );
}
