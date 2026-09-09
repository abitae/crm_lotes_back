import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CrmSegmentedControl<T extends string>({
    value,
    options,
    onChange,
    className,
}: {
    value: T;
    options: { value: T; label: string; icon?: LucideIcon }[];
    onChange: (value: T) => void;
    className?: string;
}) {
    return (
        <div className={cn('flex items-center rounded-lg border border-border bg-muted/30 p-0.5', className)}>
            {options.map((option) => {
                const Icon = option.icon;

                return (
                    <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant={value === option.value ? 'default' : 'ghost'}
                        className="h-8"
                        onClick={() => onChange(option.value)}
                    >
                        {Icon ? <Icon className="mr-1.5 h-4 w-4" /> : null}
                        {option.label}
                    </Button>
                );
            })}
        </div>
    );
}
