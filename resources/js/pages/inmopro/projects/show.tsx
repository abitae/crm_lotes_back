import { Head, router, usePage } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    ChevronDown,
    ChevronUp,
    Download,
    FileText,
    ImageIcon,
    MapPin,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ProjectLocationLink } from '@/components/inmopro/project-location-link';
import AppLayout from '@/layouts/app-layout';
import { confirmToggleProjectActive } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import { ProjectLotsTable } from './project-lots-table';
import { ProjectShowHeader } from './project-show-header';
import type {
    Advisor,
    Client,
    Lot,
    LotPayload,
    PageProps,
    ProjectAsset,
} from './show-types';
import { toDateStr, toNum } from './show-utils';
import {
    SEARCH_CACHE_MAX,
    SEARCH_DEBOUNCE_MS,
    SEARCH_MIN_CHARS,
    searchAdvisors,
    searchClients,
    useSearchableSelect,
} from './use-searchable-select';

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

export default function ProjectsShow({ project, lotStatuses }: PageProps) {
    const { errors } = usePage<PageProps>().props;
    const [savingLotId, setSavingLotId] = useState<number | null>(null);
    const [savingAll, setSavingAll] = useState(false);
    const [edited, setEdited] = useState<
        Record<number, Partial<Record<string, string | number | null>>>
    >({});
    const [advisorSearchTerm, setAdvisorSearchTerm] = useState<
        Record<number, string>
    >({});
    const clientJustSelectedRef = useRef<{ lotId: number } | null>(null);

    const clientSearch = useSearchableSelect<Client>(searchClients, {
        cacheMax: SEARCH_CACHE_MAX,
        debounceMs: SEARCH_DEBOUNCE_MS,
        minChars: SEARCH_MIN_CHARS,
    });
    const advisorSearch = useSearchableSelect<Advisor>(searchAdvisors, {
        cacheMax: SEARCH_CACHE_MAX,
        debounceMs: SEARCH_DEBOUNCE_MS,
        minChars: SEARCH_MIN_CHARS,
    });

    const transferredStatusId = lotStatuses.find(
        (status) => status.code === 'TRANSFERIDO',
    )?.id;

    const getEffectiveStatusId = (lot: Lot): number =>
        (edited[lot.id]?.lot_status_id as number | undefined) ??
        lot.status?.id ??
        lotStatuses[0]?.id ??
        0;

    const isTransferredStatus = (lot: Lot): boolean =>
        transferredStatusId != null &&
        getEffectiveStatusId(lot) === transferredStatusId;

    const calculateRemainingBalance = (
        price: string | number | null | undefined,
        advance: string | number | null | undefined,
    ): number | null => {
        const normalizedPrice = toNum(price);
        const normalizedAdvance = toNum(advance) ?? 0;

        if (normalizedPrice === null) {
            return null;
        }

        return Number((normalizedPrice - normalizedAdvance).toFixed(2));
    };

    const buildPayload = (
        lot: Lot,
        overrides: Partial<LotPayload>,
    ): LotPayload => ({
        lot_status_id: getEffectiveStatusId(lot),
        client_id:
            overrides.client_id !== undefined
                ? overrides.client_id
                : (lot.client?.id ?? null),
        advisor_id:
            overrides.advisor_id !== undefined
                ? overrides.advisor_id
                : (lot.advisor?.id ?? null),
        client_name: lot.client_name ?? lot.client?.name ?? null,
        client_dni: lot.client_dni ?? lot.client?.dni ?? null,
        client_phone: lot.client_phone ?? lot.client?.phone ?? null,
        advance: toNum(lot.advance),
        remaining_balance: calculateRemainingBalance(lot.price, lot.advance),
        payment_limit_date: lot.payment_limit_date
            ? toDateStr(lot.payment_limit_date)
            : null,
        operation_number: lot.operation_number ?? null,
        contract_date: lot.contract_date ? toDateStr(lot.contract_date) : null,
        contract_number: lot.contract_number ?? null,
        notarial_transfer_date: lot.notarial_transfer_date
            ? toDateStr(lot.notarial_transfer_date)
            : null,
        observations: lot.observations ?? null,
        block: lot.block,
        number: lot.number,
        area: toNum(lot.area),
        price: toNum(lot.price),
        ...overrides,
    });

    const updateLot = (lot: Lot, payload: LotPayload) => {
        setSavingLotId(lot.id);
        setEdited((prev) => {
            const next = { ...prev };
            delete next[lot.id];
            return next;
        });

        router.put(`/inmopro/lots/${lot.id}`, payload, {
            onFinish: () => setSavingLotId(null),
            preserveScroll: true,
        });
    };

    const getCellValue = (
        lot: Lot,
        field: keyof Lot | 'advisor_name',
    ): string => {
        if (field === 'advisor_name') {
            return (edited[lot.id]?.advisor_name ??
                lot.advisor?.name ??
                '') as string;
        }

        const editedRow = edited[lot.id];

        if (editedRow && field in editedRow) {
            const value = editedRow[field as string];
            return value != null && value !== '' ? String(value) : '';
        }

        if (field === 'client_name') {
            return lot.client_name ?? lot.client?.name ?? '';
        }

        if (field === 'client_dni') {
            return lot.client_dni ?? lot.client?.dni ?? '';
        }

        if (field === 'client_phone') {
            return lot.client_phone ?? lot.client?.phone ?? '';
        }

        const rawValue = lot[field as keyof Lot];
        return rawValue != null && rawValue !== '' ? String(rawValue) : '';
    };

    const setCellEdit = (
        lot: Lot,
        field: string,
        value: string | number | null,
    ) => {
        setEdited((prev) => {
            const nextRow = { ...prev[lot.id], [field]: value };

            if (
                field === 'lot_status_id' &&
                transferredStatusId != null &&
                Number(value) === transferredStatusId
            ) {
                const nextPrice = toNum(nextRow.price ?? lot.price);
                if (nextPrice !== null) {
                    nextRow.advance = nextPrice;
                    nextRow.remaining_balance = 0;
                }
            }

            if (field === 'price' || field === 'advance') {
                const nextPrice =
                    field === 'price' ? value : (nextRow.price ?? lot.price);
                const nextStatusId =
                    (nextRow.lot_status_id as number | undefined) ??
                    lot.status?.id;
                if (
                    transferredStatusId != null &&
                    nextStatusId === transferredStatusId
                ) {
                    const normalizedPrice = toNum(nextPrice);
                    if (normalizedPrice !== null) {
                        nextRow.advance = normalizedPrice;
                        nextRow.remaining_balance = 0;
                    }
                } else {
                    const nextAdvance =
                        field === 'advance'
                            ? value
                            : (nextRow.advance ?? lot.advance);
                    nextRow.remaining_balance = calculateRemainingBalance(
                        nextPrice,
                        nextAdvance,
                    );
                }
            }

            return { ...prev, [lot.id]: nextRow };
        });
    };

    const buildRowPayloadForSave = (lot: Lot): LotPayload => {
        const price = toNum(getCellValue(lot, 'price')) ?? toNum(lot.price);
        const transferred = isTransferredStatus(lot);

        return buildPayload(lot, {
            lot_status_id: getEffectiveStatusId(lot),
            advisor_id:
                typeof (
                    edited[lot.id]?.advisor_id ??
                    lot.advisor?.id ??
                    null
                ) === 'string'
                    ? toNum(edited[lot.id]?.advisor_id as string)
                    : ((edited[lot.id]?.advisor_id ??
                          lot.advisor?.id ??
                          null) as number | null),
            advance: transferred
                ? price
                : (toNum(getCellValue(lot, 'advance')) ?? toNum(lot.advance)),
            area: toNum(getCellValue(lot, 'area')) ?? toNum(lot.area),
            client_dni: getCellValue(lot, 'client_dni').trim() || null,
            client_id:
                typeof (edited[lot.id]?.client_id ?? lot.client?.id ?? null) ===
                'string'
                    ? toNum(edited[lot.id]?.client_id as string)
                    : ((edited[lot.id]?.client_id ?? lot.client?.id ?? null) as
                          | number
                          | null),
            client_name: getCellValue(lot, 'client_name').trim() || null,
            client_phone: getCellValue(lot, 'client_phone').trim() || null,
            contract_date: getCellValue(lot, 'contract_date')
                ? toDateStr(getCellValue(lot, 'contract_date'))
                : lot.contract_date
                  ? toDateStr(lot.contract_date)
                  : null,
            contract_number:
                getCellValue(lot, 'contract_number').trim() ||
                (lot.contract_number ?? null),
            notarial_transfer_date: getCellValue(lot, 'notarial_transfer_date')
                ? toDateStr(getCellValue(lot, 'notarial_transfer_date'))
                : lot.notarial_transfer_date
                  ? toDateStr(lot.notarial_transfer_date)
                  : null,
            observations:
                getCellValue(lot, 'observations').trim() ||
                (lot.observations ?? null),
            operation_number:
                getCellValue(lot, 'operation_number').trim() ||
                (lot.operation_number ?? null),
            payment_limit_date: getCellValue(lot, 'payment_limit_date')
                ? toDateStr(getCellValue(lot, 'payment_limit_date'))
                : lot.payment_limit_date
                  ? toDateStr(lot.payment_limit_date)
                  : null,
            price,
            remaining_balance: transferred
                ? 0
                : calculateRemainingBalance(
                      price,
                      toNum(getCellValue(lot, 'advance')) ?? toNum(lot.advance),
                  ),
        });
    };

    const pendingEditsCount = Object.keys(edited).length;
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

    const saveAllChanges = () => {
        if (pendingEditsCount === 0 || !project.lots?.length) {
            return;
        }

        const lotsToSave = Object.keys(edited)
            .map((id) => project.lots?.find((lot) => lot.id === Number(id)))
            .filter((lot): lot is Lot => lot != null)
            .map((lot) => ({
                id: lot.id,
                ...buildRowPayloadForSave(lot),
            }));

        if (lotsToSave.length === 0) {
            return;
        }

        setSavingAll(true);
        router.put(
            `/inmopro/projects/${project.id}/lots/bulk-update`,
            { lots: lotsToSave },
            {
                onFinish: () => setSavingAll(false),
                onSuccess: () => setEdited({}),
                preserveScroll: true,
            },
        );
    };

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
                    clientError={errors?.client}
                    onToggleActive={handleToggleActive}
                    onSaveAll={saveAllChanges}
                    pendingEditsCount={pendingEditsCount}
                    savingAll={savingAll || savingLotId !== null}
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

                <ProjectLotsTable
                    project={project}
                    lotStatuses={lotStatuses}
                    savingLotId={savingLotId}
                    edited={edited}
                    clientSearch={clientSearch}
                    advisorSearch={advisorSearch}
                    advisorSearchTerm={advisorSearchTerm}
                    setAdvisorSearchTerm={setAdvisorSearchTerm}
                    clientJustSelectedRef={clientJustSelectedRef}
                    getCellValue={getCellValue}
                    setCellEdit={setCellEdit}
                    getEffectiveStatusId={getEffectiveStatusId}
                    isTransferredStatus={isTransferredStatus}
                    transferredStatusId={transferredStatusId}
                    buildPayload={buildPayload}
                    buildRowPayloadForSave={buildRowPayloadForSave}
                    updateLot={updateLot}
                />
            </div>
        </AppLayout>
    );
}
