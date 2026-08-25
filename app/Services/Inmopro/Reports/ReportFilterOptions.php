<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ReportFilterOptions
{
    public function includeInactive(Request $request): bool
    {
        return $request->boolean('include_inactive');
    }

    /**
     * @return Builder<Project>
     */
    public function projectsQuery(bool $includeInactive = false): Builder
    {
        return Project::query()
            ->when(! $includeInactive, fn (Builder $query) => $query->active())
            ->when($includeInactive, fn (Builder $query) => $query->orderByDesc('is_active'))
            ->orderBy('name');
    }

    /**
     * @return array{projects: Collection, teams: Collection, advisors: Collection, lotStatuses: Collection, allLotStatuses: Collection}
     */
    public function all(bool|Request $includeInactive = false): array
    {
        if ($includeInactive instanceof Request) {
            $includeInactive = $this->includeInactive($includeInactive);
        }

        return [
            'projects' => $this->projectsQuery($includeInactive)->get(['id', 'name', 'is_active']),
            'teams' => Team::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color']),
            'advisors' => Advisor::query()
                ->with('team:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'team_id', 'personal_quota']),
            'lotStatuses' => LotStatus::query()
                ->where('code', '!=', LotStatus::CODE_LIBRE)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code']),
            'allLotStatuses' => LotStatus::query()
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code']),
        ];
    }
}
