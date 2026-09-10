import { router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type {
    Advisor,
    Client,
    Lot,
    LotPayload,
    LotStatus,
    PageProps,
    Project,
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

export function useProjectLotsEditor(
    project: Project,
    lotStatuses: LotStatus[],
) {
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

    return {
        advisorSearch,
        advisorSearchTerm,
        buildPayload,
        buildRowPayloadForSave,
        clientError: errors?.client,
        clientJustSelectedRef,
        clientSearch,
        edited,
        getCellValue,
        getEffectiveStatusId,
        isTransferredStatus,
        pendingEditsCount,
        saveAllChanges,
        savingAll: savingAll || savingLotId !== null,
        savingLotId,
        setAdvisorSearchTerm,
        setCellEdit,
        transferredStatusId,
        updateLot,
    };
}
