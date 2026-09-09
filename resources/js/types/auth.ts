export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    permissions?: string[];
    roles?: string[];
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Advisor = {
    id: number;
    name: string;
    username: string;
    email: string | null;
    phone: string | null;
    team: { id: number; name: string; color: string | null } | null;
    level: { id: number; name: string; code: string } | null;
};

export type Auth = {
    user: User;
    advisor?: Advisor | null;
};

export type PendingReminderItem = {
    id: number;
    title: string;
    remind_at: string | null;
    client: { id: number; name: string } | null;
};

export type PendingRemindersShared = {
    count: number;
    items: PendingReminderItem[];
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
