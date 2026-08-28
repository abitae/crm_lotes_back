<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Datero;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DaterosIndexQuery
{
    /**
     * @var list<int>
     */
    public const PER_PAGE_OPTIONS = [10, 15, 20, 50, 100];

    public const DEFAULT_PER_PAGE = 15;

    /**
     * @return array{created_from: string, created_to: string}
     */
    public function defaultDateFilters(): array
    {
        $today = now();

        return [
            'created_from' => $today->copy()->startOfMonth()->toDateString(),
            'created_to' => $today->toDateString(),
        ];
    }

    public function shouldRedirectWithDefaultDates(Request $request): bool
    {
        return ! $request->hasAny(['created_from', 'created_to']);
    }

    public function mergeDefaultDatesIfMissing(Request $request): void
    {
        if ($this->shouldRedirectWithDefaultDates($request)) {
            $request->merge($this->defaultDateFilters());
        }
    }

    /**
     * @param  Builder<Datero>  $query
     */
    public function apply(Builder $query, Request $request): void
    {
        $query
            ->when($request->filled('search'), function (Builder $builder) use ($request): void {
                $term = (string) $request->input('search');

                $builder->where(function (Builder $inner) use ($term): void {
                    $inner->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('dni', 'like', "%{$term}%")
                        ->orWhere('username', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%");
                });
            })
            ->when($request->filled('advisor_id'), fn (Builder $builder) => $builder->where('advisor_id', $request->integer('advisor_id')))
            ->when($request->filled('city_id'), fn (Builder $builder) => $builder->where('city_id', $request->integer('city_id')))
            ->when($request->has('is_active') && $request->input('is_active') !== '', function (Builder $builder) use ($request): void {
                $builder->where('is_active', $request->boolean('is_active'));
            });

        $createdFrom = $this->parseDateInput($request->input('created_from'));
        $createdTo = $this->parseDateInput($request->input('created_to'));

        if ($createdFrom) {
            $query->whereDate('created_at', '>=', $createdFrom->toDateString());
        }

        if ($createdTo) {
            $query->whereDate('created_at', '<=', $createdTo->toDateString());
        }
    }

    /**
     * @param  Builder<Datero>  $query
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
            'advisor_id',
            'city_id',
            'is_active',
            'created_from',
            'created_to',
        ]);

        $filters['per_page'] = (string) $this->perPage($request);

        return $filters;
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
