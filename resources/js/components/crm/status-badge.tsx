import { cn } from '@/lib/utils';

const FALLBACK_COLOR = '#94a3b8';

type StatusBadgeProps = {
    color?: string | null;
    children: React.ReactNode;
    className?: string;
};

export function StatusBadge({ color, children, className }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted/70 px-2 py-0.5 text-xs font-medium',
                className,
            )}
        >
            <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color ?? FALLBACK_COLOR }}
            />
            <span className="truncate">{children}</span>
        </span>
    );
}
