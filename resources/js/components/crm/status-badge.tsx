const FALLBACK_COLOR = '#94a3b8';

type StatusBadgeProps = {
    color?: string | null;
    children: React.ReactNode;
    className?: string;
};

export function StatusBadge({ color, children, className }: StatusBadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color ?? FALLBACK_COLOR }} />
            {children}
        </span>
    );
}
