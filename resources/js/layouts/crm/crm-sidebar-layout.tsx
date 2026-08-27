import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { CrmSidebar } from '@/components/crm/crm-sidebar';
import { CrmSidebarHeader } from '@/components/crm/crm-sidebar-header';
import FlashSwal from '@/components/flash-swal';
import type { AppLayoutProps } from '@/types';

export default function CrmSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <FlashSwal />
            <CrmSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <CrmSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
