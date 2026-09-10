import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Eye, Save, X } from 'lucide-react';
import type {
    Dispatch,
    MutableRefObject,
    SetStateAction} from 'react';
import {
    useMemo,
    useState,
    type CSSProperties,
} from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatClientPhone, MASKED_CLIENT_PHONE, useCanViewClientPhone } from '@/lib/inmopro-permissions';
import { cn } from '@/lib/utils';
import type {
    Advisor,
    Client,
    Lot,
    LotPayload,
    LotStatus,
    Project,
} from './show-types';
import {
    compareLotsByBlockAndNumber,
    filterProjectLots,
    toDateStr,
} from './show-utils';

type SearchState<T extends { id: number }> = {
    openKey: string | null;
    setOpenKey: (key: string | null) => void;
    results: T[];
    loading: boolean;
    triggerSearch: (q: string, key: string) => void;
};

type EditedState = Record<
    number,
    Partial<Record<string, string | number | null>>
>;

const inputClass =
    'w-full min-w-0 rounded-md border-0 bg-transparent px-2 py-1 text-xs text-slate-800 outline-none transition focus:bg-white focus:ring-1 focus:ring-[#224583] disabled:opacity-60 dark:text-slate-100 dark:focus:bg-slate-800 dark:focus:ring-sky-400';
const selectClass =
    'w-full min-w-0 max-w-[120px] rounded-md border-0 bg-transparent px-2 py-1 text-xs text-slate-800 outline-none transition focus:bg-white focus:ring-1 focus:ring-[#224583] disabled:opacity-60 dark:text-slate-100 dark:focus:bg-slate-800 dark:focus:ring-sky-400';
const statusColumnClass = 'min-w-[10.5rem] w-[10.5rem]';
const statusSelectClass =
    'w-full min-w-[9.5rem] rounded-full border border-transparent px-3 py-1 text-xs font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-[#224583]/20 focus:ring-offset-0 disabled:opacity-60';

function lotStatusColor(
    code: string,
    lotStatuses: LotStatus[],
    fallback?: string,
): string | undefined {
    return (
        lotStatuses.find((status) => status.code === code)?.color ?? fallback
    );
}

function lotStatusSelectStyle(color?: string): CSSProperties {
    if (!color) {
        return {};
    }

    return {
        backgroundColor: `${color}22`,
        borderColor: color,
        color: '#0f172a',
    };
}

function lotStatusOptionStyle(color?: string): CSSProperties {
    if (!color) {
        return { backgroundColor: '#f8fafc', color: '#0f172a' };
    }

    return {
        backgroundColor: color,
        color: '#ffffff',
    };
}

function lotRowStyle(
    statusColor: string | undefined,
    isSaving: boolean,
): CSSProperties | undefined {
    if (isSaving) {
        return { backgroundColor: '#f59e0b22' };
    }

    if (!statusColor) {
        return undefined;
    }

    return { backgroundColor: `${statusColor}10` };
}

export function ProjectLotsTable({
    project,
    lotStatuses,
    savingLotId,
    edited,
    clientSearch,
    advisorSearch,
    advisorSearchTerm,
    setAdvisorSearchTerm,
    clientJustSelectedRef,
    getCellValue,
    setCellEdit,
    getEffectiveStatusId,
    isTransferredStatus,
    transferredStatusId,
    buildPayload,
    buildRowPayloadForSave,
    updateLot,
    variant = 'embedded',
}: {
    project: Project;
    lotStatuses: LotStatus[];
    savingLotId: number | null;
    edited: EditedState;
    clientSearch: SearchState<Client>;
    advisorSearch: SearchState<Advisor>;
    advisorSearchTerm: Record<number, string>;
    setAdvisorSearchTerm: Dispatch<SetStateAction<Record<number, string>>>;
    clientJustSelectedRef: MutableRefObject<{ lotId: number } | null>;
    getCellValue: (lot: Lot, field: keyof Lot | 'advisor_name') => string;
    setCellEdit: (
        lot: Lot,
        field: string,
        value: string | number | null,
    ) => void;
    getEffectiveStatusId: (lot: Lot) => number;
    isTransferredStatus: (lot: Lot) => boolean;
    transferredStatusId?: number;
    buildPayload: (lot: Lot, overrides: Partial<LotPayload>) => LotPayload;
    buildRowPayloadForSave: (lot: Lot) => LotPayload;
    updateLot: (lot: Lot, payload: LotPayload) => void;
    variant?: 'embedded' | 'workspace';
}) {
    const [clientDniFilter, setClientDniFilter] = useState('');
    const [clientNameFilter, setClientNameFilter] = useState('');
    const [lotStatusFilter, setLotStatusFilter] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const canViewPhone = useCanViewClientPhone();
    const isWorkspace = variant === 'workspace';
    const showTable = isWorkspace || isOpen;

    const allLots = project.lots ?? [];

    const filteredLots = useMemo(() => {
        const filtered = filterProjectLots(allLots, {
            clientDni: clientDniFilter,
            clientName: clientNameFilter,
            lotStatusId: lotStatusFilter,
        });

        return [...filtered].sort(compareLotsByBlockAndNumber);
    }, [allLots, clientDniFilter, clientNameFilter, lotStatusFilter]);

    const hasActiveFilters =
        clientDniFilter !== '' ||
        clientNameFilter !== '' ||
        lotStatusFilter !== '';

    const clearFilters = () => {
        setClientDniFilter('');
        setClientNameFilter('');
        setLotStatusFilter('');
    };

    if (allLots.length === 0) {
        if (!isWorkspace) {
            return null;
        }

        return (
            <Card className="flex h-full min-h-0 items-center justify-center rounded-2xl border-0 bg-white py-0 shadow-[0_20px_40px_rgba(0,27,68,0.06)] dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                <CardContent className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Este proyecto aún no tiene lotes registrados.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className={cn(
                'min-w-0 gap-0 rounded-2xl border-0 bg-white py-0 shadow-[0_20px_40px_rgba(0,27,68,0.06)] dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none',
                isWorkspace && 'flex h-full min-h-0 flex-col overflow-hidden',
            )}
        >
            <CardContent
                className={cn(
                    'flex min-w-0 flex-col gap-0 p-0',
                    isWorkspace && 'h-full min-h-0',
                )}
            >
                <div className="shrink-0 bg-white px-5 py-5 dark:bg-slate-950">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
                                Inventario comercial
                            </p>
                            <p className="text-lg font-black text-[#001b44] dark:text-slate-50">
                                Lotes del proyecto
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Orden: manzana y número. Mostrando{' '}
                                {filteredLots.length} de {allLots.length}{' '}
                                lote(s).
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {isWorkspace ? null : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                    onClick={() =>
                                        setIsOpen((value) => !value)
                                    }
                                >
                                    {isOpen ? (
                                        <ChevronUp className="mr-1 h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="mr-1 h-3.5 w-3.5" />
                                    )}
                                    {isOpen ? 'Minimizar' : 'Maximizar'}
                                </Button>
                            )}
                            {hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                    onClick={clearFilters}
                                >
                                    <X className="mr-1 h-3.5 w-3.5" />
                                    Limpiar filtros
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    {showTable && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1">
                                <Label
                                    htmlFor="lot-filter-dni"
                                    className="text-xs"
                                >
                                    DNI cliente
                                </Label>
                                <Input
                                    id="lot-filter-dni"
                                    value={clientDniFilter}
                                    onChange={(e) =>
                                        setClientDniFilter(e.target.value)
                                    }
                                    placeholder="Buscar por DNI"
                                    className="h-10 rounded-xl border-transparent bg-[#f5f3f3] text-sm shadow-none focus-visible:ring-[#224583]/20 dark:bg-slate-900 dark:text-slate-100 dark:text-slate-400 dark:placeholder:text-slate-500 dark:focus-visible:ring-sky-400/30"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label
                                    htmlFor="lot-filter-name"
                                    className="text-xs"
                                >
                                    Nombre cliente
                                </Label>
                                <Input
                                    id="lot-filter-name"
                                    value={clientNameFilter}
                                    onChange={(e) =>
                                        setClientNameFilter(e.target.value)
                                    }
                                    placeholder="Buscar por nombre"
                                    className="h-10 rounded-xl border-transparent bg-[#f5f3f3] text-sm shadow-none focus-visible:ring-[#224583]/20 dark:bg-slate-900 dark:text-slate-100 dark:text-slate-400 dark:placeholder:text-slate-500 dark:focus-visible:ring-sky-400/30"
                                />
                            </div>
                            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                <Label
                                    htmlFor="lot-filter-status"
                                    className="text-xs"
                                >
                                    Estado del lote
                                </Label>
                                <select
                                    id="lot-filter-status"
                                    value={lotStatusFilter}
                                    onChange={(e) =>
                                        setLotStatusFilter(e.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border-transparent bg-[#f5f3f3] px-3 text-sm shadow-none outline-none focus:ring-2 focus:ring-[#224583]/20 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-400/30"
                                >
                                    <option value="">Todos los estados</option>
                                    {lotStatuses.map((status) => (
                                        <option
                                            key={status.id}
                                            value={status.id}
                                        >
                                            {status.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
                {showTable && (
                    <div
                        className={cn(
                            'min-w-0 bg-white dark:bg-slate-950',
                            isWorkspace
                                ? 'min-h-0 flex-1 overflow-auto'
                                : 'w-full overflow-x-auto',
                        )}
                    >
                        {filteredLots.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                Ningún lote coincide con los filtros aplicados.
                            </p>
                        ) : (
                            <table className="w-max min-w-full border-collapse text-xs [&_tbody_td]:border [&_tbody_td]:border-slate-200 [&_tbody_td]:px-3 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_tbody_td]:whitespace-nowrap dark:[&_tbody_td]:border-slate-800">
                                <thead className="sticky top-0 z-20 bg-[#f5f3f3] shadow-[0_1px_0_0_rgba(15,23,42,0.08)] dark:bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Manzana
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Número
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Área
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Precio
                                        </th>
                                        <th
                                            className={`px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400 ${statusColumnClass}`}
                                        >
                                            Estado
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Nombre cliente
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            DNI
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Teléfono
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Asesor
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Adelanto
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Monto rest.
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            F. limite
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            N° op.
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            F. contrato
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Nº contrato
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            F. escritura
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Observ.
                                        </th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase whitespace-nowrap bg-[#f5f3f3] dark:bg-slate-900 dark:text-slate-400">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLots.map((lot) => {
                                        const isSaving = savingLotId === lot.id;
                                        const effectiveStatusId =
                                            getEffectiveStatusId(lot);
                                        const effectiveStatus =
                                            lotStatuses.find(
                                                (status) =>
                                                    status.id ===
                                                    effectiveStatusId,
                                            );
                                        const statusCode =
                                            effectiveStatus?.code ??
                                            lot.status?.code ??
                                            'LIBRE';
                                        const statusColor =
                                            effectiveStatus?.color ??
                                            lot.status?.color ??
                                            lotStatusColor(
                                                statusCode,
                                                lotStatuses,
                                            );
                                        const canEdit =
                                            statusCode === 'RESERVADO' ||
                                            statusCode === 'TRANSFERIDO';
                                        const requiresTransferDate =
                                            isTransferredStatus(lot);

                                        return (
                                            <tr
                                                key={lot.id}
                                                style={lotRowStyle(
                                                    statusColor,
                                                    isSaving,
                                                )}
                                            >
                                                <td className="border border-border px-1 py-0.5 align-middle text-slate-700 dark:text-slate-200">
                                                    {lot.block}
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle text-slate-700 tabular-nums dark:text-slate-200">
                                                    {lot.number}
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={getCellValue(
                                                            lot,
                                                            'area',
                                                        )}
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'area',
                                                                e.target.value
                                                                    ? Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      )
                                                                    : null,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '4rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={getCellValue(
                                                            lot,
                                                            'price',
                                                        )}
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'price',
                                                                e.target.value
                                                                    ? Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      )
                                                                    : null,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '5rem',
                                                        }}
                                                    />
                                                </td>
                                                <td
                                                    className={`border border-border px-2 py-1 align-middle ${statusColumnClass}`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/80"
                                                            style={{
                                                                backgroundColor:
                                                                    statusColor ??
                                                                    '#94a3b8',
                                                            }}
                                                            title={
                                                                lot.status
                                                                    ?.name ??
                                                                statusCode
                                                            }
                                                        />
                                                        <select
                                                            value={
                                                                effectiveStatusId ||
                                                                ''
                                                            }
                                                            disabled={isSaving}
                                                            onChange={(e) => {
                                                                const newStatusId =
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    );
                                                                if (
                                                                    transferredStatusId !=
                                                                        null &&
                                                                    newStatusId ===
                                                                        transferredStatusId &&
                                                                    lot.status
                                                                        ?.id !==
                                                                        transferredStatusId
                                                                ) {
                                                                    setCellEdit(
                                                                        lot,
                                                                        'lot_status_id',
                                                                        newStatusId,
                                                                    );
                                                                    return;
                                                                }
                                                                updateLot(
                                                                    lot,
                                                                    buildPayload(
                                                                        lot,
                                                                        {
                                                                            lot_status_id:
                                                                                newStatusId,
                                                                        },
                                                                    ),
                                                                );
                                                            }}
                                                            className={
                                                                statusSelectClass
                                                            }
                                                            style={lotStatusSelectStyle(
                                                                statusColor,
                                                            )}
                                                            title={
                                                                effectiveStatus?.name ??
                                                                lot.status
                                                                    ?.name ??
                                                                'Estado del lote'
                                                            }
                                                        >
                                                            {lotStatuses.map(
                                                                (status) => (
                                                                    <option
                                                                        key={
                                                                            status.id
                                                                        }
                                                                        value={
                                                                            status.id
                                                                        }
                                                                        style={lotStatusOptionStyle(
                                                                            status.color,
                                                                        )}
                                                                    >
                                                                        {
                                                                            status.name
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>
                                                </td>
                                                <ClientLookupCell
                                                    lot={lot}
                                                    field="client_name"
                                                    searchKey={`${lot.id}_client_name`}
                                                    getCellValue={getCellValue}
                                                    setCellEdit={setCellEdit}
                                                    clientSearch={clientSearch}
                                                    advisorSearch={
                                                        advisorSearch
                                                    }
                                                    isSaving={isSaving}
                                                    canEdit={canEdit}
                                                    clientJustSelectedRef={
                                                        clientJustSelectedRef
                                                    }
                                                    placeholder="Buscar por nombre"
                                                    width="8rem"
                                                />
                                                <ClientLookupCell
                                                    lot={lot}
                                                    field="client_dni"
                                                    searchKey={`${lot.id}_client_dni`}
                                                    getCellValue={getCellValue}
                                                    setCellEdit={setCellEdit}
                                                    clientSearch={clientSearch}
                                                    advisorSearch={
                                                        advisorSearch
                                                    }
                                                    isSaving={isSaving}
                                                    canEdit={canEdit}
                                                    clientJustSelectedRef={
                                                        clientJustSelectedRef
                                                    }
                                                    placeholder="Buscar por DNI"
                                                    width="6rem"
                                                />
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="text"
                                                        value={
                                                            canViewPhone
                                                                ? getCellValue(
                                                                      lot,
                                                                      'client_phone',
                                                                  )
                                                                : MASKED_CLIENT_PHONE
                                                        }
                                                        disabled={
                                                            isSaving ||
                                                            !canEdit ||
                                                            !canViewPhone
                                                        }
                                                        placeholder={
                                                            canViewPhone
                                                                ? 'Opcional'
                                                                : 'Sin permiso'
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'client_phone',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '6rem',
                                                        }}
                                                    />
                                                </td>
                                                <AdvisorLookupCell
                                                    lot={lot}
                                                    advisorSearch={
                                                        advisorSearch
                                                    }
                                                    clientSearch={clientSearch}
                                                    advisorSearchTerm={
                                                        advisorSearchTerm
                                                    }
                                                    setAdvisorSearchTerm={
                                                        setAdvisorSearchTerm
                                                    }
                                                    getCellValue={getCellValue}
                                                    setCellEdit={setCellEdit}
                                                    isSaving={isSaving}
                                                    canEdit={canEdit}
                                                />
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={getCellValue(
                                                            lot,
                                                            'advance',
                                                        )}
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'advance',
                                                                e.target.value
                                                                    ? Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      )
                                                                    : null,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '5rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={getCellValue(
                                                            lot,
                                                            'remaining_balance',
                                                        )}
                                                        disabled
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '5rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="date"
                                                        value={
                                                            getCellValue(
                                                                lot,
                                                                'payment_limit_date',
                                                            )
                                                                ? toDateStr(
                                                                      getCellValue(
                                                                          lot,
                                                                          'payment_limit_date',
                                                                      ),
                                                                  )
                                                                : ''
                                                        }
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'payment_limit_date',
                                                                e.target
                                                                    .value ||
                                                                    null,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '7rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="text"
                                                        value={getCellValue(
                                                            lot,
                                                            'operation_number',
                                                        )}
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'operation_number',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '5rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="date"
                                                        value={
                                                            getCellValue(
                                                                lot,
                                                                'contract_date',
                                                            )
                                                                ? toDateStr(
                                                                      getCellValue(
                                                                          lot,
                                                                          'contract_date',
                                                                      ),
                                                                  )
                                                                : ''
                                                        }
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'contract_date',
                                                                e.target
                                                                    .value ||
                                                                    null,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '7rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="text"
                                                        value={getCellValue(
                                                            lot,
                                                            'contract_number',
                                                        )}
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'contract_number',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '6rem',
                                                        }}
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="date"
                                                        value={
                                                            getCellValue(
                                                                lot,
                                                                'notarial_transfer_date',
                                                            )
                                                                ? toDateStr(
                                                                      getCellValue(
                                                                          lot,
                                                                          'notarial_transfer_date',
                                                                      ),
                                                                  )
                                                                : ''
                                                        }
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        required={
                                                            requiresTransferDate
                                                        }
                                                        aria-required={
                                                            requiresTransferDate
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'notarial_transfer_date',
                                                                e.target
                                                                    .value ||
                                                                    null,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '7rem',
                                                        }}
                                                        title={
                                                            requiresTransferDate
                                                                ? 'Fecha de escritura obligatoria para transferir'
                                                                : undefined
                                                        }
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <input
                                                        type="text"
                                                        value={getCellValue(
                                                            lot,
                                                            'observations',
                                                        )}
                                                        disabled={
                                                            isSaving || !canEdit
                                                        }
                                                        onChange={(e) =>
                                                            setCellEdit(
                                                                lot,
                                                                'observations',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={inputClass}
                                                        style={{
                                                            minWidth: '8rem',
                                                        }}
                                                        title={
                                                            lot.observations ??
                                                            ''
                                                        }
                                                    />
                                                </td>
                                                <td className="border border-border px-1 py-0.5 align-middle">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {(canEdit ||
                                                            edited[lot.id]) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                disabled={
                                                                    isSaving
                                                                }
                                                                onClick={() =>
                                                                    updateLot(
                                                                        lot,
                                                                        buildRowPayloadForSave(
                                                                            lot,
                                                                        ),
                                                                    )
                                                                }
                                                                title="Guardar cambios"
                                                            >
                                                                <Save className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/inmopro/lots/${lot.id}`}
                                                                title="Ver detalle"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ClientLookupCell({
    lot,
    field,
    searchKey,
    getCellValue,
    setCellEdit,
    clientSearch,
    advisorSearch,
    isSaving,
    canEdit,
    clientJustSelectedRef,
    placeholder,
    width,
}: {
    lot: Lot;
    field: 'client_name' | 'client_dni';
    searchKey: string;
    getCellValue: (lot: Lot, field: keyof Lot | 'advisor_name') => string;
    setCellEdit: (
        lot: Lot,
        field: string,
        value: string | number | null,
    ) => void;
    clientSearch: SearchState<Client>;
    advisorSearch: SearchState<Advisor>;
    isSaving: boolean;
    canEdit: boolean;
    clientJustSelectedRef: MutableRefObject<{ lotId: number } | null>;
    placeholder: string;
    width: string;
}) {
    const canViewPhone = useCanViewClientPhone();
    return (
        <td className="relative border border-border px-1 py-0.5 align-middle">
            <input
                type="text"
                value={getCellValue(lot, field)}
                disabled={isSaving || !canEdit}
                onChange={(e) => {
                    const value = e.target.value;
                    setCellEdit(lot, field, value);
                    clientSearch.setOpenKey(searchKey);
                    advisorSearch.setOpenKey(null);
                    clientSearch.triggerSearch(value, searchKey);
                }}
                onFocus={() => {
                    const value = getCellValue(lot, field);
                    clientSearch.setOpenKey(searchKey);
                    advisorSearch.setOpenKey(null);
                    clientSearch.triggerSearch(value, searchKey);
                }}
                onBlur={() => {
                    setTimeout(() => clientSearch.setOpenKey(null), 180);
                    if (clientJustSelectedRef.current?.lotId === lot.id) {
                        clientJustSelectedRef.current = null;
                    }
                }}
                className={inputClass}
                style={{ minWidth: width }}
                placeholder={placeholder}
            />
            {clientSearch.openKey === searchKey && (
                <div className="absolute top-full left-0 z-20 mt-0.5 max-h-40 w-72 overflow-auto rounded border border-border bg-popover text-popover-foreground shadow-lg">
                    {clientSearch.loading ? (
                        <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                            Buscando...
                        </div>
                    ) : clientSearch.results.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                            Sin resultados. Se creara cliente al guardar.
                        </div>
                    ) : (
                        clientSearch.results.map((client) => (
                            <button
                                key={client.id}
                                type="button"
                                className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                }}
                                onClick={() => {
                                    clientJustSelectedRef.current = {
                                        lotId: lot.id,
                                    };
                                    setCellEdit(lot, 'client_id', client.id);
                                    setCellEdit(
                                        lot,
                                        'client_name',
                                        client.name,
                                    );
                                    setCellEdit(
                                        lot,
                                        'client_dni',
                                        client.dni ?? null,
                                    );
                                    setCellEdit(
                                        lot,
                                        'client_phone',
                                        client.phone ?? null,
                                    );
                                    clientSearch.setOpenKey(null);
                                }}
                            >
                                <span className="font-medium">
                                    {client.name}
                                </span>
                                {(client.dni || client.phone) && (
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {field === 'client_name'
                                            ? [client.dni, formatClientPhone(client.phone, canViewPhone)]
                                                  .filter((value) => value && value !== '—')
                                                  .join(' · ')
                                            : `DNI: ${client.dni ?? '-'} · ${
                                                  formatClientPhone(client.phone, canViewPhone)
                                              }`}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </td>
    );
}

function AdvisorLookupCell({
    lot,
    advisorSearch,
    clientSearch,
    advisorSearchTerm,
    setAdvisorSearchTerm,
    getCellValue,
    setCellEdit,
    isSaving,
    canEdit,
}: {
    lot: Lot;
    advisorSearch: SearchState<Advisor>;
    clientSearch: SearchState<Client>;
    advisorSearchTerm: Record<number, string>;
    setAdvisorSearchTerm: Dispatch<SetStateAction<Record<number, string>>>;
    getCellValue: (lot: Lot, field: keyof Lot | 'advisor_name') => string;
    setCellEdit: (
        lot: Lot,
        field: string,
        value: string | number | null,
    ) => void;
    isSaving: boolean;
    canEdit: boolean;
}) {
    const searchKey = `${lot.id}_advisor`;

    return (
        <td className="relative border border-border px-1 py-0.5 align-middle">
            <input
                type="text"
                value={
                    advisorSearch.openKey === searchKey
                        ? (advisorSearchTerm[lot.id] ??
                          getCellValue(lot, 'advisor_name'))
                        : getCellValue(lot, 'advisor_name')
                }
                disabled={isSaving || !canEdit}
                onChange={(e) => {
                    const value = e.target.value;
                    setAdvisorSearchTerm((prev) => ({
                        ...prev,
                        [lot.id]: value,
                    }));
                    advisorSearch.setOpenKey(searchKey);
                    clientSearch.setOpenKey(null);
                    advisorSearch.triggerSearch(value, searchKey);
                }}
                onFocus={() => {
                    const value = getCellValue(lot, 'advisor_name');
                    setAdvisorSearchTerm((prev) => ({
                        ...prev,
                        [lot.id]: value,
                    }));
                    advisorSearch.setOpenKey(searchKey);
                    clientSearch.setOpenKey(null);
                    advisorSearch.triggerSearch(value, searchKey);
                }}
                onBlur={() => {
                    setTimeout(() => {
                        advisorSearch.setOpenKey(null);
                        setAdvisorSearchTerm((prev) => {
                            const next = { ...prev };
                            delete next[lot.id];
                            return next;
                        });
                    }, 180);
                }}
                className={inputClass}
                style={{ minWidth: '9rem' }}
                placeholder="Buscar asesor"
            />
            {advisorSearch.openKey === searchKey && (
                <div className="absolute top-full left-0 z-20 mt-0.5 max-h-40 w-72 overflow-auto rounded border border-border bg-popover text-popover-foreground shadow-lg">
                    {advisorSearch.loading ? (
                        <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                            Buscando...
                        </div>
                    ) : advisorSearch.results.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                            Sin resultados.
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="flex w-full px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                }}
                                onClick={() => {
                                    setCellEdit(lot, 'advisor_id', null);
                                    setCellEdit(lot, 'advisor_name', '');
                                    setAdvisorSearchTerm((prev) => ({
                                        ...prev,
                                        [lot.id]: '',
                                    }));
                                    advisorSearch.setOpenKey(null);
                                }}
                            >
                                - Ninguno
                            </button>
                            {advisorSearch.results.map((advisor) => (
                                <button
                                    key={advisor.id}
                                    type="button"
                                    className="flex w-full px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                    }}
                                    onClick={() => {
                                        setCellEdit(
                                            lot,
                                            'advisor_id',
                                            advisor.id,
                                        );
                                        setCellEdit(
                                            lot,
                                            'advisor_name',
                                            advisor.name,
                                        );
                                        setAdvisorSearchTerm((prev) => ({
                                            ...prev,
                                            [lot.id]: advisor.name,
                                        }));
                                        advisorSearch.setOpenKey(null);
                                    }}
                                >
                                    {advisor.name}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </td>
    );
}
