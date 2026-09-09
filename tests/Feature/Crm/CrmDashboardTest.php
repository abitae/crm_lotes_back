<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(ClientStatusSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_dashboard_reports_correct_client_counts_by_status_for_own_clients_only(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('is_active', true)->firstOrFail();
        $otherStatus = ClientStatus::query()->forAdvisor($otherAdvisor->id)->where('is_active', true)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        // Two of the advisor's own clients in this status...
        for ($i = 0; $i < 2; $i++) {
            Client::create([
                'name' => 'Cliente dash '.$i,
                'dni' => (string) (70000000 + $advisor->id * 10 + $i),
                'phone' => '988888'.str_pad((string) $i, 3, '0', STR_PAD_LEFT),
                'client_type_id' => $ownType->id,
                'client_status_id' => $status->id,
                'city_id' => $city->id,
                'advisor_id' => $advisor->id,
            ]);
        }

        // ...and one belonging to a different advisor, which must not be counted.
        Client::create([
            'name' => 'Cliente ajeno',
            'dni' => (string) (70000000 + $otherAdvisor->id * 10 + 99),
            'phone' => '977777777',
            'client_type_id' => $ownType->id,
            'client_status_id' => $otherStatus->id,
            'city_id' => $city->id,
            'advisor_id' => $otherAdvisor->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('kpis.clients.total', 2)
                ->where(
                    'kpis.clients_by_status',
                    fn ($statuses) => collect($statuses)->firstWhere('id', $status->id)['count'] === 2,
                ));
    }
}
