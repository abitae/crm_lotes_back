<?php

namespace App\Support;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class AdvisorCatalogRules
{
    public static function statusId(int $advisorId, bool $activeOnly = true): Exists
    {
        $rule = Rule::exists('client_statuses', 'id')->where('advisor_id', $advisorId);

        return $activeOnly ? $rule->where('is_active', true) : $rule;
    }

    public static function tagId(int $advisorId, bool $activeOnly = true): Exists
    {
        $rule = Rule::exists('client_tags', 'id')->where('advisor_id', $advisorId);

        return $activeOnly ? $rule->where('is_active', true) : $rule;
    }
}
