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
    size?: 'md' | 'lg';
    className?: string;
}) {
    const toneClasses = inmoproMetricTone[tone];

    return (
        <div className={cn(size === 'md' ? inmoproUi.metricCardMd : inmoproUi.metricCard, className)}>
            <div className={cn('flex items-start justify-between gap-2', Icon ? 'mb-3 sm:mb-4' : '')}>
                <p className={inmoproUi.metricLabel}>{label}</p>
                {Icon ? (
                    <div className={cn('shrink-0 rounded-2xl p-2.5 sm:p-3', toneClasses.icon)}>
                        <Icon className="h-5 w-5" />
                    </div>
                ) : null}
            </div>
            <p
                className={cn(
                    'font-black',
                    size === 'md' ? inmoproUi.metricValue : inmoproUi.metricValueLg,
                    toneClasses.value,
                )}
            >
                {value}
            </p>
        </div>
    );
}
