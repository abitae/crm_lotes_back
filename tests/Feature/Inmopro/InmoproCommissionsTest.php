<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Commission;
use App\Models\Inmopro\CommissionStatus;
use App\Models\Inmopro\InmoproAuditLog;
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

    public function test_paying_a_commission_is_audited_and_cannot_be_paid_twice(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $lot = Lot::query()->firstOrFail();
        $lot->update([
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'sale_price' => 10000,
        ]);
        app(CommissionService::class)->createCommissionsForTransferredLot($lot->fresh());
        $commission = Commission::query()->where('lot_id', $lot->id)->where('type', 'DIRECTA')->firstOrFail();

        $this->post(route('inmopro.commissions.mark-as-paid', $commission))
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $commission->refresh();
        $paidAt = $commission->paid_at;

        $log = InmoproAuditLog::query()->where('action', 'commissions.paid')->sole();
        $this->assertSame($user->id, $log->user_id);
        $this->assertSame(Commission::class, $log->subject_type);
        $this->assertSame($commission->id, $log->subject_id);
        $this->assertSame((string) $commission->paid_amount, $log->meta['paid_amount']);
        $this->assertSame('PENDIENTE', $log->meta['status_before']);
        $this->assertSame('PAGADO', $log->meta['status_after']);
        $this->assertSame($commission->advisor_id, $log->meta['advisor_id']);

        $this->post(route('inmopro.commissions.mark-as-paid', $commission))
            ->assertSessionHasErrors('commission');

        $this->assertSame(1, InmoproAuditLog::query()->where('action', 'commissions.paid')->count());
        $this->assertTrue($paidAt->equalTo($commission->fresh()->paid_at));
    }
}
