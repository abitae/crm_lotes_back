import { usePage } from '@inertiajs/react';

export const INMOPRO_CLIENTS_VIEW_PHONE = 'inmopro.clients.view-phone';
export const MASKED_CLIENT_PHONE = '••••••••';

type AuthUser = {
    permissions?: string[];
    roles?: string[];
} | null | undefined;

export function userHasInmoproPermission(
    user: AuthUser,
    permission: string,
): boolean {
    if (user?.roles?.includes('super-admin')) {
        return true;
    }

    return user?.permissions?.includes(permission) ?? false;
}

export function userCanViewClientPhone(user: AuthUser): boolean {
    return userHasInmoproPermission(user, INMOPRO_CLIENTS_VIEW_PHONE);
}

export function formatClientPhone(
    phone: string | null | undefined,
    canView: boolean,
): string {
    if (!canView) {
        return MASKED_CLIENT_PHONE;
    }

    const value = (phone ?? '').trim();

    return value !== '' ? value : '—';
}

export function useCanViewClientPhone(): boolean {
    const user = usePage<{
        auth: {
            user?: { permissions?: string[]; roles?: string[] } | null;
        };
    }>().props.auth.user;

    return userCanViewClientPhone(user);
}
