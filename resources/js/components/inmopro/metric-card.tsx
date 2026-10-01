import type { LucideIcon } from 'lucide-react';
import { inmoproMetricTone, inmoproUi, type InmoproMetricTone } from '@/lib/inmopro-ui';
import { cn } from '@/lib/utils';

export function InmoproMetricCard({
    label,
    value,
    tone = 'slate',
    icon: Icon,
    size = 'lg',
    className,
}: {
    label: string;
    value: string;
    tone?: InmoproMetricTone;
    icon?: LucideIcon;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const toneClasses = inmoproMetricTone[tone];
    const shell =
        size === 'sm'
            ? 'min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white'
            : size === 'md'
              ? inmoproUi.metricCardMd
              : inmoproUi.metricCard;

    return (
        <div className={cn(shell, className)}>
            <div className={cn('flex items-start justify-between gap-2', Icon ? (size === 'sm' ? 'mb-2' : 'mb-3 sm:mb-4') : '')}>
                <p className={inmoproUi.metricLabel}>{label}</p>
                {Icon ? (
                    <div
                        className={cn(
                            'shrink-0',
                            size === 'sm' ? 'rounded-lg p-1.5' : 'rounded-2xl p-2.5 sm:p-3',
                            toneClasses.icon,
                        )}
                    >
                        <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
                    </div>
                ) : null}
            </div>
            <p
                className={cn(
                    'font-black',
                    size === 'sm' ? 'text-xl' : size === 'md' ? inmoproUi.metricValue : inmoproUi.metricValueLg,
                    toneClasses.value,
                )}
            >
                {value}
            </p>
        </div>
    );
}
