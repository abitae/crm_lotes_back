/**
 * Clases compartidas para paneles y tarjetas de Inmopro (modo claro y oscuro).
 */
export const inmoproUi = {
    page: 'min-h-full bg-[#fbf9f8] p-4 text-slate-950 md:p-6 dark:bg-slate-950 dark:text-white',
    pageInner: 'mx-auto w-full max-w-[1500px] space-y-6',
    panel: 'rounded-2xl border border-white/70 bg-white text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none',
    panelMd: 'rounded-2xl border border-white/70 bg-white text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none',
    panelSm: 'rounded-xl border border-white/70 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white',
    filterBar: 'rounded-2xl border border-white/70 bg-white p-4 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-5 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none',
    tableShell: 'overflow-hidden rounded-2xl border border-white/70 bg-white text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none',
    hero: 'overflow-hidden rounded-2xl border border-white/70 bg-white p-5 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none',
    eyebrow: 'text-xs font-black tracking-[0.22em] text-emerald-600 uppercase dark:text-emerald-300',
    pageTitle: 'text-3xl font-black tracking-tight text-slate-950 dark:text-white',
    pageTitleBold: 'text-3xl font-black tracking-tight text-slate-950 dark:text-white',
    pageSubtitle: 'mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400',
    sectionTitle: 'text-lg font-black text-slate-950 dark:text-white',
    metricCard: 'min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-slate-950 sm:p-5 dark:border-slate-800 dark:bg-slate-950 dark:text-white',
    metricCardMd: 'rounded-2xl border border-slate-100 bg-slate-50 p-4 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white',
    metricLabel: 'text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500',
    metricValue: 'mt-2 text-lg font-black text-slate-950 dark:text-white',
    metricValueLg: 'mt-3 text-2xl font-black text-slate-950 sm:text-3xl dark:text-white',
    input: 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-500/20',
    tableHead: 'bg-slate-50 dark:bg-slate-950',
    tableHeadCell: 'font-black tracking-wide text-slate-500 uppercase dark:text-slate-400',
    tableRowHover: 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50',
    divide: 'divide-slate-100 dark:divide-slate-800',
    borderSubtle: 'border-slate-100 dark:border-slate-800',
} as const;

export const inmoproMetricTone = {
    slate: {
        value: 'text-foreground',
        icon: 'bg-muted text-muted-foreground',
    },
    blue: {
        value: 'text-blue-600 dark:text-blue-300',
        icon: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
    },
    emerald: {
        value: 'text-emerald-600 dark:text-emerald-300',
        icon: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    amber: {
        value: 'text-amber-600 dark:text-amber-300',
        icon: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    },
    rose: {
        value: 'text-rose-600 dark:text-rose-300',
        icon: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
    },
    sky: {
        value: 'text-sky-600 dark:text-sky-300',
        icon: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
    },
    violet: {
        value: 'text-violet-600 dark:text-violet-300',
        icon: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    },
} as const;

export type InmoproMetricTone = keyof typeof inmoproMetricTone;
