import { router } from '@inertiajs/react';
import { CalendarRange } from 'lucide-react';
import type { FormEvent } from 'react';
import { IncludeInactiveProjectsField } from '@/components/inmopro/reports/IncludeInactiveProjectsField';
import { Button } from '@/components/ui/button';
import { toYmdLocal } from '@/lib/report-utils';

type DateFilters = {
    start_date?: string | null;
    end_date?: string | null;
    include_inactive?: string | number | boolean | null;
    [key: string]: string | number | boolean | null | undefined;
};

type Props = {
    basePath: string;
    filters: DateFilters;
    extraFields?: Record<string, string | number | boolean | null | undefined>;
    children?: React.ReactNode;
    showInactiveProjectsToggle?: boolean;
};

function preservedFilterFields(
    filters: DateFilters,
    extraFields: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
    const preserved: Record<string, string> = {};

    Object.entries(filters).forEach(([key, value]) => {
        if (key === 'start_date' || key === 'end_date') {
            return;
        }

        if (value !== null && value !== undefined && value !== '') {
            preserved[key] = String(value);
        }
    });

    Object.entries(extraFields).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            preserved[key] = String(value);
        }
    });

    return preserved;
}

function queryFromForm(
    form: HTMLFormElement,
    extraFields: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
    const query = preservedFilterFields({}, extraFields);
    const formData = new FormData(form);

    formData.forEach((value, key) => {
        const normalized = String(value);

        if (normalized !== '') {
            query[key] = normalized;
        }
    });

    return query;
}

export function ReportDateFilters({
    basePath,
    filters,
    extraFields = {},
    children,
    showInactiveProjectsToggle = true,
}: Props) {
    const navigate = (patch: Partial<DateFilters>) => {
        router.get(
            basePath,
            {
                ...preservedFilterFields(filters, {
                    ...extraFields,
                    ...(showInactiveProjectsToggle
                        ? { include_inactive: filters.include_inactive ? '1' : '0' }
                        : {}),
                }),
                start_date: patch.start_date ?? filters.start_date ?? undefined,
                end_date: patch.end_date ?? filters.end_date ?? undefined,
            },
            { preserveScroll: true },
        );
    };

    const applyPreset = (preset: 'this_month' | 'last_month' | 'quarter' | 'ytd') => {
        const end = new Date();
        if (preset === 'this_month') {
            navigate({
                start_date: toYmdLocal(new Date(end.getFullYear(), end.getMonth(), 1)),
                end_date: toYmdLocal(end),
            });
            return;
        }
        if (preset === 'last_month') {
            navigate({
                start_date: toYmdLocal(new Date(end.getFullYear(), end.getMonth() - 1, 1)),
                end_date: toYmdLocal(new Date(end.getFullYear(), end.getMonth(), 0)),
            });
            return;
        }
        if (preset === 'quarter') {
            const qi = Math.floor(end.getMonth() / 3);
            navigate({
                start_date: toYmdLocal(new Date(end.getFullYear(), qi * 3, 1)),
                end_date: toYmdLocal(end),
            });
            return;
        }
        navigate({
            start_date: toYmdLocal(new Date(end.getFullYear(), 0, 1)),
            end_date: toYmdLocal(end),
        });
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get(basePath, queryFromForm(e.currentTarget, extraFields), { preserveScroll: true });
    };

    return (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <CalendarRange className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Periodo</span>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
                {(['this_month', 'last_month', 'quarter', 'ytd'] as const).map((p) => (
                    <Button key={p} type="button" variant="outline" size="sm" onClick={() => applyPreset(p)}>
                        {p === 'this_month' ? 'Este mes' : p === 'last_month' ? 'Mes anterior' : p === 'quarter' ? 'Trimestre' : 'Año'}
                    </Button>
                ))}
            </div>
            <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Desde</span>
                    <input
                        type="date"
                        name="start_date"
                        defaultValue={filters.start_date ?? ''}
                        className="rounded-xl border border-input px-3 py-2"
                    />
                </label>
                <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Hasta</span>
                    <input
                        type="date"
                        name="end_date"
                        defaultValue={filters.end_date ?? ''}
                        className="rounded-xl border border-input px-3 py-2"
                    />
                </label>
                {children}
                {showInactiveProjectsToggle ? (
                    <IncludeInactiveProjectsField checked={Boolean(filters.include_inactive)} />
                ) : null}
                <Button type="submit">Aplicar</Button>
            </form>
        </div>
    );
}
