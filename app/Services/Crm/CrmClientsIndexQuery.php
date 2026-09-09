<?php

namespace App\Services\Crm;

use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Filter/sort/paginate query-object for the advisor-facing clients listing,
 * mirroring App\Services\Inmopro\ClientsIndexQuery's pattern (dedicated query
 * object, per_page whitelist, testable independent of the HTTP layer) rather
 * than the ad hoc inline filtering the CRM controller used to do.
 *
 * Ownership scoping (advisor_id, PROPIO/DATERO) is intentionally NOT applied
 * here — that stays explicit in ClientController::advisorVisibleClientsQuery()
 * so it can't accidentally be dropped by a future caller of this class.
 */
class CrmClientsIndexQuery
{
    /**
     * @var list<int>
     */
    public const PER_PAGE_OPTIONS = [10, 20, 50, 100];

    public const DEFAULT_PER_PAGE = 20;

    /**
     * @var list<string>
     */
    public const FILTER_KEYS = [
        'search',
        'client_type',
        'client_status_id',
        'tag_ids',
        'tag_id',
        'city_id',
        'created_from',
        'created_to',
        'per_page',
    ];

    /**
     * @param  Builder<Client>  $query
     */
    public function apply(Builder $query, Request $request): void
    {
        $tagIds = $this->tagIdsFromRequest($request);

        $query
            ->when($request->filled('client_type'), function (Builder $builder) use ($request): void {
                $code = (string) $request->input('client_type');
                $builder->where('client_type_id', ClientType::query()->where('code', $code)->value('id'));
            })
            ->when($request->filled('client_status_id'), fn (Builder $builder) => $builder->where('client_status_id', $request->integer('client_status_id')))
            ->when($tagIds !== [], function (Builder $builder) use ($tagIds): void {
                foreach ($tagIds as $tagId) {
                    $builder->whereHas('tags', fn (Builder $tagQuery) => $tagQuery->where('client_tags.id', $tagId));
                }
            })
            ->when($request->filled('city_id'), fn (Builder $builder) => $builder->where('city_id', $request->integer('city_id')))
            ->when($request->filled('search'), function (Builder $builder) use ($request): void {
                $this->applySearch($builder, (string) $request->input('search'));
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
     * @param  Builder<Client>  $query
     */
    public function applyDefaultOrdering(Builder $query): void
    {
        $query->orderBy('name')->orderBy('id');
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
            'client_type',
            'client_status_id',
            'city_id',
            'created_from',
            'created_to',
        ]);

        $filters['tag_ids'] = $this->tagIdsFromRequest($request);
        $filters['per_page'] = (string) $this->perPage($request);

        return $filters;
    }

    /**
     * @return list<int>
     */
    public function tagIdsFromRequest(Request $request): array
    {
        $raw = $request->input('tag_ids', []);

        if (! is_array($raw)) {
            $raw = $raw !== null && $raw !== '' ? [$raw] : [];
        }

        if ($request->filled('tag_id')) {
            $raw[] = $request->input('tag_id');
        }

        return array_values(array_unique(array_filter(
            array_map('intval', $raw),
            fn (int $id): bool => $id > 0,
        )));
    }

    /**
     * @param  Builder<Client>  $query
     */
    private function applySearch(Builder $query, string $term): void
    {
        $trimmedTerm = trim($term);
        $numericTerm = preg_replace('/\D+/', '', $trimmedTerm) ?? '';
        $isNumericSearch = $numericTerm !== '' && preg_match('/[a-záéíóúñ]/iu', $trimmedTerm) !== 1;

        $query->where(function (Builder $nestedQuery) use ($isNumericSearch, $numericTerm, $trimmedTerm): void {
            if ($isNumericSearch) {
                $nestedQuery->where('phone_normalized', 'like', $numericTerm.'%')
                    ->orWhere('dni_normalized', 'like', $numericTerm.'%');

                return;
            }

            $nestedQuery->where('name', 'like', '%'.$trimmedTerm.'%');
        });
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
