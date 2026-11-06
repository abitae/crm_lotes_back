export const PAYMENT_MODE_LABELS: Record<string, string> = {
    INTERES_PERIODICO: 'Interés periódico y capital al final',
    CUOTAS_IGUALES: 'Cuotas iguales (capital + interés)',
    AL_VENCIMIENTO: 'Todo al vencimiento',
};

export const RATE_PERIOD_LABELS: Record<string, string> = {
    TOTAL: 'Sobre el plazo total',
    MENSUAL: 'Mensual',
    ANUAL: 'Anual',
};

export const FREQUENCY_LABELS: Record<string, string> = {
    MENSUAL: 'Mensual',
    QUINCENAL: 'Quincenal',
    SEMANAL: 'Semanal',
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
    BORRADOR: 'Borrador',
    VIGENTE: 'Vigente',
    LIQUIDADO: 'Liquidado',
    ANULADO: 'Anulado',
};

export const CONTRACT_STATUS_CLASSES: Record<string, string> = {
    BORRADOR: 'bg-slate-100 text-slate-700',
    VIGENTE: 'bg-emerald-100 text-emerald-700',
    LIQUIDADO: 'bg-blue-100 text-blue-700',
    ANULADO: 'bg-rose-100 text-rose-700',
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
    VENCIDA: 'Vencida',
    PAGADA: 'Pagada',
};

export const INSTALLMENT_STATUS_CLASSES: Record<string, string> = {
    PENDIENTE: 'bg-slate-100 text-slate-700',
    PARCIAL: 'bg-amber-100 text-amber-700',
    VENCIDA: 'bg-rose-100 text-rose-700',
    PAGADA: 'bg-emerald-100 text-emerald-700',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    TRANSFERENCIA: 'Transferencia',
    EFECTIVO: 'Efectivo',
    CHEQUE: 'Cheque',
};

export const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

export const labelClass = 'space-y-1 text-[10px] font-bold uppercase text-slate-500';

export function currencySymbol(currency: string): string {
    return currency === 'USD' ? 'US$' : 'S/';
}

export function formatMoney(value: number | string | null | undefined, currency = 'PEN'): string {
    return `${currencySymbol(currency)} ${Number(value ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isoDate(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
}

export function addToIsoDate(isoDateValue: string, frequency: string, index: number): string {
    const [year, month, day] = isoDateValue.slice(0, 10).split('-').map(Number);

    if (frequency === 'MENSUAL') {
        const targetMonth = month - 1 + index;
        const targetYear = year + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;
        const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();

        return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
    }

    const stepDays = frequency === 'QUINCENAL' ? 15 : 7;

    return new Date(Date.UTC(year, month - 1, day + stepDays * index)).toISOString().slice(0, 10);
}

function splitCents(totalCents: number, parts: number): number[] {
    const safeParts = Math.max(1, parts);
    const base = Math.floor(totalCents / safeParts);

    return Array.from({ length: safeParts }, (_, index) => (index === safeParts - 1 ? totalCents - base * (safeParts - 1) : base));
}

export type ScheduleTerms = {
    principal_amount: number;
    rate_percent: number;
    rate_period: string;
    term_months: number;
    payment_mode: string;
    installments_count: number;
    frequency: string;
    first_due_date: string;
};

export type ScheduleRow = {
    due_date: string;
    principal_amount: number;
    interest_amount: number;
};

/**
 * Misma regla que InvestorScheduleService::totalInterestCents (interés simple).
 */
export function totalInterestCents(terms: Pick<ScheduleTerms, 'principal_amount' | 'rate_percent' | 'rate_period' | 'term_months'>): number {
    const factor = terms.rate_period === 'MENSUAL' ? terms.term_months : terms.rate_period === 'ANUAL' ? terms.term_months / 12 : 1;

    return Math.round(Math.round(terms.principal_amount * 100) * (terms.rate_percent / 100) * factor);
}

/**
 * Misma regla que InvestorScheduleService::build.
 */
export function buildInvestorSchedule(terms: ScheduleTerms): ScheduleRow[] {
    if (!terms.first_due_date || terms.principal_amount <= 0 || terms.term_months < 1) {
        return [];
    }

    const count = terms.payment_mode === 'AL_VENCIMIENTO' ? 1 : Math.max(1, Math.min(360, Math.floor(terms.installments_count || 1)));
    const principalCents = Math.round(terms.principal_amount * 100);
    const interestParts = splitCents(totalInterestCents(terms), count);
    const principalParts =
        terms.payment_mode === 'CUOTAS_IGUALES'
            ? splitCents(principalCents, count)
            : [...Array.from({ length: count - 1 }, () => 0), principalCents];

    return Array.from({ length: count }, (_, index) => ({
        due_date: addToIsoDate(terms.first_due_date, terms.frequency, index),
        principal_amount: principalParts[index] / 100,
        interest_amount: interestParts[index] / 100,
    }));
}
