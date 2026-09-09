const moneyFormatter = new Intl.NumberFormat('es-PE', {
    currency: 'PEN',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: 'currency',
});

const STATUS_LABELS: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    EXPIRADA: 'Expirada',
    pendiente: 'Pendiente',
    realizado: 'Realizado',
    cancelado: 'Cancelado',
    draft: 'Borrador',
    queued: 'En cola',
    sending: 'Enviando',
    sent: 'Enviada',
    failed: 'Fallida',
    completed: 'Completada',
};

export function formatMoney(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const amount = Number(value);

    return Number.isFinite(amount) ? moneyFormatter.format(amount) : '—';
}

export function formatArea(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const area = Number(value);

    if (!Number.isFinite(area)) {
        return '—';
    }

    return `${area.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m²`;
}

export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function humanizeStatus(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    return STATUS_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
}
