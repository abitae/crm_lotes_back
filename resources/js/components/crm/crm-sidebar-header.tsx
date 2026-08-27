import { Moon, Sun } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function CrmSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggleAppearance = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border/70 px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0 flex-1">
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAppearance}
                className="shrink-0 rounded-full px-3"
                title={
                    resolvedAppearance === 'dark'
                        ? 'Activar modo claro'
                        : 'Activar modo oscuro'
                }
            >
                {resolvedAppearance === 'dark' ? (
                    <Sun className="h-4 w-4" />
                ) : (
                    <Moon className="h-4 w-4" />
                )}
            </Button>
        </header>
    );
}
