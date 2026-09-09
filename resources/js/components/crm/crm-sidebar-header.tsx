import { Moon, Sun } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CrmRemindersBell } from '@/components/crm/crm-reminders-bell';
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
    const isDark = resolvedAppearance === 'dark';

    return (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur-md md:h-16 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0 flex-1">
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <CrmRemindersBell />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                className="size-8 shrink-0 rounded-full"
                title={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="sr-only">{isDark ? 'Activar modo claro' : 'Activar modo oscuro'}</span>
            </Button>
        </header>
    );
}
