<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPayment;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ReportSalesConfig;
use App\Models\Inmopro\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class InmoproReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_view_project_reports(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $context = $this->createReportContext();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'projects']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/sales')
                ->where('view', 'projects')
                ->has('reportSettingsUrl')
                ->where('rows.0.label', $context['project']->name)
                ->where('rows.0.sold_amount', 25000)
                ->where('rows.0.collected_amount', 10000));
    }

    public function test_authenticated_users_can_view_team_reports(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $context = $this->createReportContext();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'teams']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/sales')
                ->where('view', 'teams')
                ->where('rows.0.label', $context['team']->name)
                ->where('rows.0.goal_amount', 80000));
    }

    public function test_authenticated_users_can_filter_advisor_reports_by_dates(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $context = $this->createReportContext();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', [
                'view' => 'advisors',
                'advisor_id' => $context['advisor']->id,
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/sales')
                ->where('view', 'advisors')
                ->where('filters.advisor_id', $context['advisor']->id)
                ->where('filters.start_date', '2026-03-01')
                ->where('filters.end_date', '2026-03-31')
                ->where('rows.0.label', $context['advisor']->name));

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', [
                'view' => 'advisors',
                'start_date' => '2026-04-01',
                'end_date' => '2026-04-30',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/sales')
                ->where('rows.0.label', $context['advisor']->name)
                ->where('rows.0.sold_amount', 0)
                ->where('rows.0.lots_count', 0));
    }

    public function test_reports_default_date_range_is_first_of_month_through_today(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 10:30:00'));
        $this->createReportContext();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'projects']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.start_date', '2026-03-01')
                ->where('filters.end_date', '2026-03-15'));
    }

    public function test_summary_meta_uses_configured_general_goal_not_sum_of_rows(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $this->createReportContext();
        ReportSalesConfig::current()->update(['general_sales_goal' => 500000]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'projects']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.goal_amount', 500000)
                ->where('summary.sold_amount', 25000));
    }

    public function test_summary_includes_kpi_fields_for_collection_and_ticket(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $this->createReportContext();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'projects']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.lots_count', 1)
                ->where('summary.avg_sale_per_lot', 25000)
                ->where('summary.collection_pct', 40)
                ->where('summary.rows_goal_sum', 80000));
    }

    public function test_authenticated_users_can_download_reports_csv(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $context = $this->createReportContext();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('inmopro.reports.csv', [
            'view' => 'projects',
        ]));

        $response->assertOk();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $response->streamedContent());
        $this->assertStringContainsString('Proyecto', $response->streamedContent());
        $this->assertStringContainsString($context['project']->name, $response->streamedContent());
    }

    public function test_team_view_uses_group_sales_goal_when_positive(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00'));
        $context = $this->createReportContext();
        $context['team']->update(['group_sales_goal' => 120000]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.sales.index', ['view' => 'teams']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'teams')
                ->where('rows.0.goal_amount', 120000));
    }

    /**
     * @return array{team: Team, advisor: Advisor, project: Project}
     */
    private function createReportContext(): array
    {
        $team = Team::create([
            'name' => 'Team Norte',
            'code' => 'TEAM_NORTE',
            'description' => 'Equipo Norte',
            'color' => '#0f766e',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $level = AdvisorLevel::create([
            'name' => 'Nivel Senior',
            'code' => 'NIVEL_SENIOR',
            'direct_rate' => 5,
            'pyramid_rate' => 2,
            'color' => '#10b981',
            'sort_order' => 1,
        ]);

        $city = City::create([
            'name' => 'Lima',
            'code' => 'LIM',
            'department' => 'Lima',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $advisor = Advisor::create([
            'dni' => '11111111',
            'name' => 'Asesor Uno',
            'phone' => '999111222',
            'email' => 'asesor@example.com',
            'city_id' => $city->id,
            'team_id' => $team->id,
            'advisor_level_id' => $level->id,
            'personal_quota' => 80000,
        ]);

        $project = Project::create([
            'name' => 'Proyecto Sol',
            'location' => 'Huancayo',
            'total_lots' => 30,
            'blocks' => ['A'],
        ]);

        $soldStatus = LotStatus::create([
            'name' => 'Transferido',
            'code' => 'TRANSFERIDO',
            'color' => '#64748b',
            'sort_order' => 2,
        ]);

        $lot = Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'block' => 'A',
            'number' => '1',
            'area' => 100,
            'price' => 25000,
            'advance' => 5000,
            'remaining_balance' => 15000,
            'lot_status_id' => $soldStatus->id,
            'contract_date' => '2026-03-10',
        ]);

        LotPayment::create([
            'lot_id' => $lot->id,
            'amount' => 10000,
            'paid_at' => '2026-03-12',
            'payment_method' => 'TRANSFERENCIA',
        ]);

        return [
            'team' => $team,
            'advisor' => $advisor,
            'project' => $project,
        ];
    }
}
