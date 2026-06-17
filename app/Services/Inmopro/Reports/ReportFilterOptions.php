<?php

namespace App\Services\Inmopro\Reports;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Team;
use Illuminate\Support\Collection;

class ReportFilterOptions
{
    /**
     * @return array{projects: Collection, teams: Collection, advisors: Collection, lotStatuses: Collection}
     */
    public function all(): array
    {
        return [
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
            'teams' => Team::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'color']),
            'advisors' => Advisor::query()
                ->with('team:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'team_id', 'personal_quota']),
            'lotStatuses' => LotStatus::query()
                ->where('code', '!=', LotStatus::CODE_LIBRE)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code']),
        ];
    }
}
