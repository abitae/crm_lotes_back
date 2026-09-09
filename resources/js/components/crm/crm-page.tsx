import { cn } from '@/lib/utils';

export function CrmPage({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-1 flex-col gap-6 p-4 md:p-6', className)}>
            {children}
        </div>
    );
}

export function CrmPageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
                {description ? (
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
