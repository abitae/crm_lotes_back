import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { confirmToggleProjectActive } from '@/lib/swal';
import { ProjectLotsTable } from './project-lots-table';
import { ProjectShowHeader } from './project-show-header';
import type { Advisor, Client, Lot, LotPayload, PageProps } from './show-types';
import { toDateStr, toNum } from './show-utils';
import {
    SEARCH_CACHE_MAX,
    SEARCH_DEBOUNCE_MS,
    SEARCH_MIN_CHARS,
    searchAdvisors,
    searchClients,
    useSearchableSelect,
} from './use-searchable-select';

export default function ProjectsShow({ project, lotStatuses }: PageProps) {
    const { errors } = usePage<PageProps>().props;
    const [savingLotId, setSavingLotId] = useState<number | null>(null);
    const [savingAll, setSavingAll] = useState(false);
    const [edited, setEdited] = useState<Record<number, Partial<Record<string, string | number | null>>>>({});
    const [advisorSearchTerm, setAdvisorSearchTerm] = useState<Record<number, string>>({});
    const clientJustSelectedRef = useRef<{ lotId: number } | null>(null);

    const clientSearch = useSearchableSelect<Client>(searchClients, {
        debounceMs: SEARCH_DEBOUNCE_MS,
        minChars: SEARCH_MIN_CHARS,
        cacheMax: SEARCH_CACHE_MAX,
    });
    const advisorSearch = useSearchableSelect<Advisor>(searchAdvisors, {
        debounceMs: SEARCH_DEBOUNCE_MS,
        minChars: SEARCH_MIN_CHARS,
        cacheMax: SEARCH_CACHE_MAX,
    });

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

    const buildPayload = (lot: Lot, overrides: Partial<LotPayload>): LotPayload => ({
        lot_status_id: lot.status?.id ?? lotStatuses[0]?.id ?? 0,
        client_id: overrides.client_id !== undefined ? overrides.client_id : (lot.client?.id ?? null),
        advisor_id: overrides.advisor_id !== undefined ? overrides.advisor_id : (lot.advisor?.id ?? null),
        client_name: lot.client_name ?? lot.client?.name ?? null,
        client_dni: lot.client_dni ?? lot.client?.dni ?? null,
        client_phone: lot.client_phone ?? lot.client?.phone ?? null,
        advance: toNum(lot.advance),
        remaining_balance: calculateRemainingBalance(lot.price, lot.advance),
        payment_limit_date: lot.payment_limit_date ? toDateStr(lot.payment_limit_date) : null,
        operation_number: lot.operation_number ?? null,
        contract_date: lot.contract_date ? toDateStr(lot.contract_date) : null,
        contract_number: lot.contract_number ?? null,
        notarial_transfer_date: lot.notarial_transfer_date ? toDateStr(lot.notarial_transfer_date) : null,
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
            preserveScroll: true,
            onFinish: () => setSavingLotId(null),
        });
    };

    const getCellValue = (lot: Lot, field: keyof Lot | 'advisor_name'): string => {
        if (field === 'advisor_name') {
            return (edited[lot.id]?.advisor_name ?? lot.advisor?.name ?? '') as string;
        }

        const editedRow = edited[lot.id];

        if (editedRow && field in editedRow) {
            const value = editedRow[field as string];
            return value != null && value !== '' ? String(value) : '';
        }

        const rawValue = lot[field as keyof Lot];
        return rawValue != null && rawValue !== '' ? String(rawValue) : '';
    };

    const setCellEdit = (lot: Lot, field: string, value: string | number | null) => {
        setEdited((prev) => {
            const nextRow = { ...prev[lot.id], [field]: value };

            if (field === 'price' || field === 'advance') {
                const nextPrice = field === 'price' ? value : (nextRow.price ?? lot.price);
                const nextAdvance = field === 'advance' ? value : (nextRow.advance ?? lot.advance);
                nextRow.remaining_balance = calculateRemainingBalance(nextPrice, nextAdvance);
            }

            return { ...prev, [lot.id]: nextRow };
        });
    };

    const buildRowPayloadForSave = (lot: Lot): LotPayload =>
        buildPayload(lot, {
            client_id:
                typeof (edited[lot.id]?.client_id ?? lot.client?.id ?? null) === 'string'
                    ? toNum(edited[lot.id]?.client_id as string)
                    : ((edited[lot.id]?.client_id ?? lot.client?.id ?? null) as number | null),
            client_name: getCellValue(lot, 'client_name').trim() || null,
            client_dni: getCellValue(lot, 'client_dni').trim() || null,
            client_phone: getCellValue(lot, 'client_phone').trim() || null,
            advisor_id:
                typeof (edited[lot.id]?.advisor_id ?? lot.advisor?.id ?? null) === 'string'
                    ? toNum(edited[lot.id]?.advisor_id as string)
                    : ((edited[lot.id]?.advisor_id ?? lot.advisor?.id ?? null) as number | null),
            area: toNum(getCellValue(lot, 'area')) ?? toNum(lot.area),
            price: toNum(getCellValue(lot, 'price')) ?? toNum(lot.price),
            advance: toNum(getCellValue(lot, 'advance')) ?? toNum(lot.advance),
            remaining_balance: calculateRemainingBalance(
                toNum(getCellValue(lot, 'price')) ?? toNum(lot.price),
                toNum(getCellValue(lot, 'advance')) ?? toNum(lot.advance),
            ),
            payment_limit_date: getCellValue(lot, 'payment_limit_date')
                ? toDateStr(getCellValue(lot, 'payment_limit_date'))
                : (lot.payment_limit_date ? toDateStr(lot.payment_limit_date) : null),
            operation_number: getCellValue(lot, 'operation_number').trim() || (lot.operation_number ?? null),
            contract_date: getCellValue(lot, 'contract_date')
                ? toDateStr(getCellValue(lot, 'contract_date'))
                : (lot.contract_date ? toDateStr(lot.contract_date) : null),
            contract_number: getCellValue(lot, 'contract_number').trim() || (lot.contract_number ?? null),
            notarial_transfer_date: getCellValue(lot, 'notarial_transfer_date')
                ? toDateStr(getCellValue(lot, 'notarial_transfer_date'))
                : (lot.notarial_transfer_date ? toDateStr(lot.notarial_transfer_date) : null),
            observations: getCellValue(lot, 'observations').trim() || (lot.observations ?? null),
        });

    const pendingEditsCount = Object.keys(edited).length;

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
        router.put(`/inmopro/projects/${project.id}/lots/bulk-update`, { lots: lotsToSave }, {
            preserveScroll: true,
            onSuccess: () => setEdited({}),
            onFinish: () => setSavingAll(false),
        });
    };

    const handleToggleActive = async () => {
        const activating = !project.is_active;
        if (!(await confirmToggleProjectActive(project.name, activating))) {
            return;
        }
        router.patch(`/inmopro/projects/${project.id}/toggle-active`, {}, { preserveScroll: true });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Proyectos', href: '/inmopro/projects' },
        { title: project.name, href: `/inmopro/projects/${project.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${project.name} - Inmopro`} />
            <div className="flex flex-col gap-4 p-4 md:p-6" style={{ minHeight: 'calc(100vh - 8rem)' }}>
                <ProjectShowHeader
                    project={project}
                    clientError={errors?.client}
                    onToggleActive={handleToggleActive}
                    onSaveAll={saveAllChanges}
                    pendingEditsCount={pendingEditsCount}
                    savingAll={savingAll || savingLotId !== null}
                />

                {(project.images?.length || project.documents?.length) ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800">Archivos del proyecto</h3>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Imágenes</p>
                                {project.images && project.images.length > 0 ? project.images.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                                        <div>
                                            <p className="font-medium text-slate-800">{asset.title || asset.file_name}</p>
                                            <p className="text-xs text-slate-500">{asset.file_name}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" href={asset.download_url}>
                                                Descargar
                                            </a>
                                            <button
                                                type="button"
                                                className="rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"
                                                onClick={() => router.delete(`/inmopro/projects/${project.id}/assets/${asset.id}`)}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-slate-500">Sin imágenes registradas.</p>}
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Documentos</p>
                                {project.documents && project.documents.length > 0 ? project.documents.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                                        <div>
                                            <p className="font-medium text-slate-800">{asset.title || asset.file_name}</p>
                                            <p className="text-xs text-slate-500">{asset.file_name}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" href={asset.download_url}>
                                                Descargar
                                            </a>
                                            <button
                                                type="button"
                                                className="rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"
                                                onClick={() => router.delete(`/inmopro/projects/${project.id}/assets/${asset.id}`)}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-slate-500">Sin documentos registrados.</p>}
                            </div>
                        </div>
                    </section>
                ) : null}

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
                    buildPayload={buildPayload}
                    buildRowPayloadForSave={buildRowPayloadForSave}
                    updateLot={updateLot}
                />
            </div>
        </AppLayout>
    );
}
