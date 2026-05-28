import { toIsoDate } from '@/lib/date';
import type { Lot } from './show-types';

export function toDateStr(value: string | undefined | null): string {
    return toIsoDate(value);
}

export function toNum(value: string | number | undefined | null): number | null {
    if (value == null || value === '') {
        return null;
    }

    const normalized = Number(value);

    return Number.isNaN(normalized) ? null : normalized;
}

export function lotClientDni(lot: Lot): string {
    return (lot.client_dni ?? lot.client?.dni ?? '').trim();
}

export function lotClientName(lot: Lot): string {
    return (lot.client_name ?? lot.client?.name ?? '').trim();
}

export function compareLotsByBlockAndNumber(a: Lot, b: Lot): number {
    const blockCompare = a.block.localeCompare(b.block, 'es', { sensitivity: 'base' });

    if (blockCompare !== 0) {
        return blockCompare;
    }

    return a.number.localeCompare(b.number, 'es', { numeric: true, sensitivity: 'base' });
}

export function filterProjectLots(
    lots: Lot[],
    filters: { clientDni: string; clientName: string; lotStatusId: string },
): Lot[] {
    const dniTerm = filters.clientDni.trim().toLowerCase();
    const nameTerm = filters.clientName.trim().toLowerCase();
    const statusId = filters.lotStatusId === '' ? null : Number(filters.lotStatusId);

    return lots.filter((lot) => {
        if (statusId !== null && lot.status?.id !== statusId) {
            return false;
        }

        if (dniTerm !== '' && !lotClientDni(lot).toLowerCase().includes(dniTerm)) {
            return false;
        }

        if (nameTerm !== '' && !lotClientName(lot).toLowerCase().includes(nameTerm)) {
            return false;
        }

        return true;
    });
}
