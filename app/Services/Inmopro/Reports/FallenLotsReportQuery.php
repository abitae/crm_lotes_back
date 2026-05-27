<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class FallenLotsReportQuery
{
    public const CRITERIA = 'Estado RESERVADO y fecha límite de pago anterior a hoy (reserva vencida sin transferir).';

    public function __construct(
        private readonly LotReportQueryBuilder $lotQueryBuilder,
    ) {}

    /**
     * @return Collection<int, Lot>
     */
    public function lots(Request $request): Collection
    {
        return $this->lotQueryBuilder
            ->base()
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->whereStatusCode($q, LotStatus::CODE_RESERVADO))
            ->tap(fn (Builder $q) => $this->lotQueryBuilder->applyCommonFilters($q, $request))
            ->whereNotNull('payment_limit_date')
            ->whereDate('payment_limit_date', '<', now()->toDateString())
            ->orderBy('payment_limit_date')
            ->get();
    }
}
