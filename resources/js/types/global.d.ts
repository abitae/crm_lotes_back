import type { Auth, PendingRemindersShared } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            brandingLogoUrl: string | null;
            auth: Auth;
            sidebarOpen: boolean;
            pendingReminders?: PendingRemindersShared;
            [key: string]: unknown;
        };
    }
}
