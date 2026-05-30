import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import FlashSwal from '@/components/flash-swal';
import { cn } from '@/lib/utils';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { url } = usePage();
    const isInmopro = url.startsWith('/inmopro');

    return (
        <AppShell variant="sidebar">
            <FlashSwal />
            <AppSidebar />
            <AppContent
                variant="sidebar"
                data-inmopro-page={isInmopro ? 'true' : undefined}
                className={cn(
                    'overflow-x-hidden',
                    isInmopro &&
                        'bg-[#fbf9f8] text-slate-950 dark:bg-slate-950 dark:text-white',
                )}
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
