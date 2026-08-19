<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\Lot;
use App\Models\User;
use App\Services\Inmopro\CommissionService;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproCommissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_guests_cannot_visit_commissions_index(): void
    {
        $response = $this->get(route('inmopro.commissions.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_commissions_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.commissions.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/commissions')
            ->has('commissions')
            ->has('commissionStatuses')
            ->has('projects')
            ->has('teams')
            ->where('filters.start_date', now()->startOfMonth()->toDateString())
            ->where('filters.end_date', now()->endOfMonth()->toDateString()));
    }

    public function test_authenticated_users_can_mark_commission_as_paid(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $lot = Lot::whereNotNull('advisor_id')->first();
        if (! $lot) {
            $this->markTestSkipped('No lot with advisor in database');
        }
        $lot->load('advisor.level');
        app(CommissionService::class)->createCommissionsForTransferredLot($lot->fresh());
        $commission = Commission::where('lot_id', $lot->id)->where('type', 'DIRECTA')->first();
        $this->assertNotNull($commission, 'Commission should be created by commission service');

        $paidStatus = CommissionStatus::where('code', 'PAGADO')->first();
        $response = $this->post(route('inmopro.commissions.mark-as-paid', $commission));

        $response->assertRedirect();
        $commission->refresh();
        $this->assertSame((int) $paidStatus->id, (int) $commission->commission_status_id);
    }
}
