const CLIENTS_LIST_KEYS = [
    'page',
    'search',
    'client_type_id',
    'city_id',
    'advisor_id',
    'created_from',
    'created_to',
    'last_action_kind',
    'last_action_from',
    'last_action_to',
] as const;

const ADVISORS_LIST_KEYS = [
    'page',
    'search',
    'advisor_level_id',
    'team_id',
    'is_active',
    'membership_pending',
    'membership_id',
    'modal',
    'advisor_id',
    'joined_from',
    'joined_to',
    'birthday_from',
    'birthday_to',
    'birthdays_upcoming',
    'subscriptions_expiring',
] as const;

function listingQuerySuffix(url: string, allowedKeys: readonly string[]): string {
    const path = url.startsWith('/') ? url : `/${url}`;
    const qIndex = path.indexOf('?');
    if (qIndex === -1) {
        return '';
    }
    const params = new URLSearchParams(path.slice(qIndex + 1));
    const next = new URLSearchParams();
    for (const key of allowedKeys) {
        const v = params.get(key);
        if (v !== null && v !== '') {
            next.set(key, v);
        }
    }
    const s = next.toString();

    return s !== '' ? `?${s}` : '';
}

export function clientsListingQuerySuffix(url: string): string {
    return listingQuerySuffix(url, CLIENTS_LIST_KEYS);
}

export function advisorsListingQuerySuffix(url: string): string {
    return listingQuerySuffix(url, ADVISORS_LIST_KEYS);
}
