import CrmSidebarLayout from '@/layouts/crm/crm-sidebar-layout';
import type { AppLayoutProps } from '@/types';

export default function CrmLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <CrmSidebarLayout breadcrumbs={breadcrumbs}>
            {children}
        </CrmSidebarLayout>
    );
}
