<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class LotReportQueryBuilder
{
    /**
     * @return Builder<Lot>
     */
    public function base(): Builder
    {
        return Lot::query()->with([
            'project:id,name,project_type_id,is_active',
            'project.projectType:id,percentage_meta',
            'status:id,name,code,color',
            'advisor:id,name,team_id,personal_quota',
            'advisor.team:id,name,color',
            'client:id,name,phone,dni,client_type_id,city_id,registered_by_datero_id',
            'client.type:id,name,code',
            'client.city:id,name',
            'client.registeredByDatero:id,name',
            'payments:id,lot_id,amount,paid_at',
        ]);
    }

    /**
     * @return Builder<Lot>
     */
    public function excludingLibreAndPreReserva(Builder $query): Builder
    {
        $statusLibre = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->value('id');
        $statusPreReserva = LotStatus::query()->where('code', LotStatus::CODE_PRERESERVA)->value('id');

        if ($statusLibre) {
            $query->where('lot_status_id', '!=', $statusLibre);
        }

        if ($statusPreReserva) {
            $query->where('lot_status_id', '!=', $statusPreReserva);
        }

        return $query;
    }

    /**
     * @return Builder<Lot>
     */
    public function applyCommonFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('advisor_id')) {
            $query->where('advisor_id', $request->integer('advisor_id'));
        }

        if ($request->filled('team_id')) {
            $teamId = $request->integer('team_id');
            $query->whereHas('advisor', fn (Builder $advisorQuery) => $advisorQuery->where('team_id', $teamId));
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->integer('client_id'));
        }

        $clientSearch = trim((string) $request->input('client_search', ''));
        if ($clientSearch !== '') {
            $like = '%'.$clientSearch.'%';
            $query->where(function (Builder $clientQuery) use ($like): void {
                $clientQuery
                    ->where('client_name', 'like', $like)
                    ->orWhereHas('client', function (Builder $client) use ($like): void {
                        $client
                            ->where('name', 'like', $like)
                            ->orWhere('phone', 'like', $like)
                            ->orWhere('dni', 'like', $like);
                    });
            });
        }

        $this->applyClientOriginFilter($query, (string) $request->input('client_origin', 'all'));
        $this->applyActiveProjectFilter($query, $request);

        return $query;
    }

    /**
     * Por defecto solo proyectos activos; con include_inactive=1 incluye inactivos.
     *
     * @return Builder<Lot>
     */
    public function applyActiveProjectFilter(Builder $query, Request $request): Builder
    {
        if (! $request->boolean('include_inactive')) {
            $query->whereHas('project', fn (Builder $projectQuery) => $projectQuery->active());
        }

        return $query;
    }

    /**
     * @return Builder<Lot>
     */
    public function applyClientOriginFilter(Builder $query, string $clientOrigin): Builder
    {
        if ($clientOrigin === 'propio') {
            $query->whereHas('client.type', fn (Builder $typeQuery) => $typeQuery->where('code', 'PROPIO'));
        } elseif ($clientOrigin === 'tercero') {
            $query->where(function (Builder $originQuery): void {
                $originQuery
                    ->whereHas('client.type', fn (Builder $typeQuery) => $typeQuery->where('code', 'DATERO'))
                    ->orWhereHas('client', fn (Builder $clientQuery) => $clientQuery->whereNotNull('registered_by_datero_id'));
            });
        }

        return $query;
    }

    /**
     * @return Builder<Lot>
     */
    public function transferredOnly(Builder $query): Builder
    {
        return $this->whereStatusCode($query, LotStatus::CODE_TRANSFERIDO);
    }

    /**
     * @return Builder<Lot>
     */
    public function whereNotarialTransferDateBetween(Builder $query, string $start, string $end): Builder
    {
        return $query
            ->whereNotNull('notarial_transfer_date')
            ->whereDate('notarial_transfer_date', '>=', $start)
            ->whereDate('notarial_transfer_date', '<=', $end);
    }

    /**
     * @return Builder<Lot>
     */
    public function whereContractDateBetween(Builder $query, string $start, string $end): Builder
    {
        return $query
            ->whereDate('contract_date', '>=', $start)
            ->whereDate('contract_date', '<=', $end);
    }

    /**
     * @return Builder<Lot>
     */
    public function whereStatusCode(Builder $query, string $code): Builder
    {
        return $query->whereHas('status', fn (Builder $statusQuery) => $statusQuery->where('code', $code));
    }
}
