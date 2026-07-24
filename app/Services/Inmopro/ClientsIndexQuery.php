<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Client;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientsIndexQuery
{
    /**
     * @var list<int>
     */
    public const PER_PAGE_OPTIONS = [10, 20, 50, 100, 500];

    public const DEFAULT_PER_PAGE = 20;

    /**
     * @var list<string>
     */
    public const FILTER_KEYS = [
        'page',
        'per_page',
        'search',
        'client_type_id',
        'city_id',
        'advisor_id',
        'created_from',
        'created_to',
        'last_action_kind',
        'last_action_from',
        'last_action_to',
    ];

    /**
     * @var array<string, string>
     */
    private const LAST_ACTION_TABLES = [
        'avisos' => 'attention_tickets',
        'lotes' => 'lots',
        'recordatorios' => 'advisor_reminders',
    ];

    /**
     * @return array{created_from: string, created_to: string, last_action_from: string, last_action_to: string}
     */
    public function defaultDateFilters(): array
    {
        $today = now();

        return [
            'created_from' => $today->copy()->startOfMonth()->toDateString(),
            'created_to' => $today->toDateString(),
            'last_action_from' => $today->copy()->startOfMonth()->toDateString(),
            'last_action_to' => $today->toDateString(),
        ];
    }

    public function shouldRedirectWithDefaultDates(Request $request): bool
    {
        return ! $request->hasAny([
            'created_from',
            'created_to',
            'last_action_from',
            'last_action_to',
        ]);
    }

    public function mergeDefaultDatesIfMissing(Request $request): void
    {
        if ($this->shouldRedirectWithDefaultDates($request)) {
            $request->merge($this->defaultDateFilters());
        }
    }

    /**
     * @param  Builder<Client>  $query
     */
    public function apply(Builder $query, Request $request): void
    {
        $query
            ->when($request->filled('search'), function (Builder $builder) use ($request): void {
                $term = (string) $request->input('search');

                $builder->where(function (Builder $inner) use ($term): void {
                    $inner->where('name', 'like', "%{$term}%")
                        ->orWhere('dni', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%");
                });
            })
            ->when($request->filled('client_type_id'), fn (Builder $builder) => $builder->where('client_type_id', $request->integer('client_type_id')))
            ->when($request->filled('city_id'), fn (Builder $builder) => $builder->where('city_id', $request->integer('city_id')))
            ->when($request->filled('advisor_id'), fn (Builder $builder) => $builder->where('advisor_id', $request->integer('advisor_id')));

        $createdFrom = $this->parseDateInput($request->input('created_from'));
        $createdTo = $this->parseDateInput($request->input('created_to'));

        if ($createdFrom) {
            $query->whereDate('created_at', '>=', $createdFrom->toDateString());
        }

        if ($createdTo) {
            $query->whereDate('created_at', '<=', $createdTo->toDateString());
        }

        $this->applyLastActionFilter($query, $request);
    }

    /**
     * @param  Builder<Client>  $query
     */
    public function applyDefaultOrdering(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }

    public function perPage(Request $request): int
    {
        $perPage = $request->integer('per_page', self::DEFAULT_PER_PAGE);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true)
            ? $perPage
            : self::DEFAULT_PER_PAGE;
    }

    /**
     * @return array<string, mixed>
     */
    public function filtersFromRequest(Request $request): array
    {
        $filters = $request->only([
            'search',
            'client_type_id',
            'city_id',
            'advisor_id',
            'created_from',
            'created_to',
            'last_action_kind',
            'last_action_from',
            'last_action_to',
        ]);

        $filters['per_page'] = (string) $this->perPage($request);

        return $filters;
    }

    /**
     * @param  Builder<Client>  $query
     */
    private function applyLastActionFilter(Builder $query, Request $request): void
    {
        $kind = $request->input('last_action_kind');

        if (! is_string($kind) || ! isset(self::LAST_ACTION_TABLES[$kind])) {
            return;
        }

        $from = $this->parseDateInput($request->input('last_action_from'));
        $to = $this->parseDateInput($request->input('last_action_to'));

        if (! $from && ! $to) {
            return;
        }

        $table = self::LAST_ACTION_TABLES[$kind];

        $subquery = DB::table($table)
            ->select('client_id')
            ->whereNotNull('client_id')
            ->groupBy('client_id');

        if ($from) {
            $subquery->havingRaw('MAX(updated_at) >= ?', [$from->copy()->startOfDay()->toDateTimeString()]);
        }

        if ($to) {
            $subquery->havingRaw('MAX(updated_at) <= ?', [$to->copy()->endOfDay()->toDateTimeString()]);
        }

        $query->whereIn('clients.id', $subquery);
    }

    private function parseDateInput(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
