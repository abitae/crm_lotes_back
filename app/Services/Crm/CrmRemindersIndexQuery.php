<?php

namespace App\Services\Crm;

use App\Models\Inmopro\AdvisorReminder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Filter/sort for the advisor-facing reminders listing.
 *
 * Ownership scoping (advisor_id, visibleForAdvisor) stays in the controller.
 */
class CrmRemindersIndexQuery
{
    public const DEFAULT_PERIOD = 'hoy';

    /**
     * @var list<string>
     */
    public const PERIODS = ['hoy', 'proximos', 'pasados'];

    public const DEFAULT_PER_PAGE = 20;

    /**
     * @param  Builder<AdvisorReminder>  $query
     */
    public function apply(Builder $query, Request $request): void
    {
        $this->applyPeriod($query, $this->period($request));

        if ($request->filled('search')) {
            $this->applySearch($query, (string) $request->input('search'));
        }

        if ($request->filled('client_id') && $request->integer('client_id') > 0) {
            $query->where('client_id', $request->integer('client_id'));
        }
    }

    /**
     * @param  Builder<AdvisorReminder>  $query
     */
    public function applyOrdering(Builder $query, Request $request): void
    {
        if ($this->period($request) === 'pasados') {
            $query->orderByDesc('remind_at')->orderByDesc('id');

            return;
        }

        $query
            ->orderByRaw('completed_at is not null')
            ->orderBy('remind_at')
            ->orderBy('id');
    }

    public function period(Request $request): string
    {
        $period = (string) $request->input('period', self::DEFAULT_PERIOD);

        return in_array($period, self::PERIODS, true) ? $period : self::DEFAULT_PERIOD;
    }

    /**
     * @return array{period: string, search: string, client_id: string}
     */
    public function filtersFromRequest(Request $request): array
    {
        $clientId = $request->filled('client_id') && $request->integer('client_id') > 0
            ? (string) $request->integer('client_id')
            : '';

        return [
            'period' => $this->period($request),
            'search' => trim((string) $request->input('search', '')),
            'client_id' => $clientId,
        ];
    }

    /**
     * @param  Builder<AdvisorReminder>  $query
     */
    private function applyPeriod(Builder $query, string $period): void
    {
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        match ($period) {
            'proximos' => $query->where('remind_at', '>', $todayEnd),
            'pasados' => $query->where('remind_at', '<', $todayStart),
            default => $query->whereBetween('remind_at', [$todayStart, $todayEnd]),
        };
    }

    /**
     * @param  Builder<AdvisorReminder>  $query
     */
    private function applySearch(Builder $query, string $term): void
    {
        $trimmedTerm = trim($term);

        if ($trimmedTerm === '') {
            return;
        }

        $like = '%'.$trimmedTerm.'%';

        $query->where(function (Builder $nested) use ($like): void {
            $nested
                ->where('title', 'like', $like)
                ->orWhere('notes', 'like', $like)
                ->orWhereHas('client', function (Builder $clientQuery) use ($like): void {
                    $clientQuery
                        ->where('name', 'like', $like)
                        ->orWhere('phone', 'like', $like);
                });
        });
    }
}
