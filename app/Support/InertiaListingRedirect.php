<?php

namespace App\Support;

use Illuminate\Http\Request;

final class InertiaListingRedirect
{
    /**
     * @return array<string, mixed>
     */
    public static function clientsIndexQuery(Request $request): array
    {
        return self::filteredOnly($request, [
            'page',
            'per_page',
            'search',
            'client_type_id',
            'client_status_id',
            'tag_id',
            'city_id',
            'advisor_id',
            'created_from',
            'created_to',
            'last_action_kind',
            'last_action_from',
            'last_action_to',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function advisorsIndexQuery(Request $request): array
    {
        return self::filteredOnly($request, [
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
        ]);
    }

    /**
     * @param  array<string, mixed>  $merge
     * @return array<string, mixed>
     */
    public static function advisorsIndexQueryMerged(Request $request, array $merge): array
    {
        return array_merge(self::advisorsIndexQuery($request), $merge);
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<string, mixed>
     */
    private static function filteredOnly(Request $request, array $keys): array
    {
        return collect($request->only($keys))
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->all();
    }
}
