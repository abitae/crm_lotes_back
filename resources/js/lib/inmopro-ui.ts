/**
 * Clases compartidas para paneles y tarjetas de Inmopro (modo claro y oscuro).
 */
export const inmoproUi = {
    panel: 'rounded-3xl border border-border bg-card text-card-foreground shadow-sm',
    panelMd: 'rounded-2xl border border-border bg-card text-card-foreground shadow-sm',
    panelSm: 'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
    filterBar: 'rounded-3xl border border-border bg-card text-card-foreground shadow-sm',
    tableShell: 'overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm',
    pageTitle: 'text-2xl font-black tracking-tight text-foreground',
    pageTitleBold: 'text-2xl font-bold tracking-tight text-foreground',
    pageSubtitle: 'mt-1 text-sm text-muted-foreground',
    sectionTitle: 'text-lg font-black text-foreground',
    metricCard: 'min-w-0 rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5',
    metricCardMd: 'rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm',
    metricLabel: 'text-[10px] font-black uppercase tracking-widest text-muted-foreground',
    metricValue: 'mt-2 text-lg font-black text-foreground',
    metricValueLg: 'mt-3 text-2xl font-black text-foreground sm:text-3xl',
    input: 'w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
    tableHead: 'bg-muted',
    tableHeadCell: 'font-bold text-muted-foreground',
    tableRowHover: 'hover:bg-muted/60',
    divide: 'divide-border',
    borderSubtle: 'border-border',
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
