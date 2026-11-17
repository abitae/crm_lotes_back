<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\InmoproAuditLog;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotHistory;
use App\Models\Inmopro\LotPayment;
use App\Models\Inmopro\LotStatus;
use App\Models\User;
use App\Support\InstallmentStatus;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproLotReleaseTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var array<string, int>
     */
    private array $statusIds;

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

        $this->statusIds = LotStatus::query()->pluck('id', 'code')->map(fn ($id) => (int) $id)->all();
    }

    public function test_fallen_sale_frees_the_lot_and_keeps_history_and_audit(): void
    {
        $user = User::factory()->create();
        $lot = $this->reservedLot(LotStatus::CODE_CUOTAS);
        $client = $lot->client;
        $lot->installments()->create([
            'sequence' => 1,
            'due_date' => now()->addMonth()->toDateString(),
            'amount' => 1000,
            'status' => InstallmentStatus::PENDIENTE,
        ]);

        $this->actingAs($user)
            ->post(route('inmopro.lots.release', $lot), [
                'reason' => 'VENTA_CAIDA',
                'notes' => 'El cliente dejó de pagar.',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $lot->refresh();
        $this->assertSame($this->statusIds['LIBRE'], (int) $lot->lot_status_id);
        $this->assertNull($lot->client_id);
        $this->assertNull($lot->client_name);
        $this->assertNull($lot->advisor_id);
        $this->assertNull($lot->sale_price);
        $this->assertNull($lot->advance);
        $this->assertNull($lot->contract_date);
        $this->assertSame(0, $lot->installments()->count());

        $history = LotHistory::query()->where('lot_id', $lot->id)->where('event', LotHistory::EVENT_SALE_FALLEN)->sole();
        $this->assertSame($user->id, $history->user_id);
        $this->assertSame('Venta caída', $history->reason);
        $this->assertSame('El cliente dejó de pagar.', $history->notes);
        $this->assertSame($client->id, $history->client_id);
        $this->assertSame($this->statusIds['CUOTAS'], $history->from_status_id);
        $this->assertSame($this->statusIds['LIBRE'], $history->to_status_id);
        $this->assertSame('20000.00', $history->meta['sale']['sale_price']);
        $this->assertSame('2000.00', $history->meta['sale']['advance']);
        $this->assertSame(1, $history->meta['sale']['installments_removed']);

        $audit = InmoproAuditLog::query()->where('action', 'lots.released')->sole();
        $this->assertSame($lot->id, $audit->subject_id);
        $this->assertSame($client->id, $audit->meta['sale']['client_id']);
    }

    public function test_other_reason_requires_notes_and_records_released_event(): void
    {
        $lot = $this->reservedLot();
        $this->actingAs(User::factory()->create());

        $this->post(route('inmopro.lots.release', $lot), ['reason' => 'OTRO'])
            ->assertSessionHasErrors('notes');

        $this->post(route('inmopro.lots.release', $lot), ['reason' => 'OTRO', 'notes' => 'Error de registro'])
            ->assertSessionHasNoErrors();

        $this->assertTrue(LotHistory::query()
            ->where('lot_id', $lot->id)
            ->where('event', LotHistory::EVENT_RELEASED)
            ->where('notes', 'Error de registro')
            ->exists());
    }

    public function test_release_is_blocked_with_payments_or_when_transferred(): void
    {
        $this->actingAs(User::factory()->create());

        $withPayments = $this->reservedLot();
        LotPayment::create([
            'lot_id' => $withPayments->id,
            'amount' => 500,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'EFECTIVO',
        ]);

        $this->post(route('inmopro.lots.release', $withPayments), ['reason' => 'VENTA_CAIDA'])
            ->assertSessionHasErrors('reason');
        $this->assertSame($this->statusIds['RESERVADO'], (int) $withPayments->refresh()->lot_status_id);

        $transferred = $this->reservedLot(LotStatus::CODE_TRANSFERIDO, [$withPayments->id]);

        $this->post(route('inmopro.lots.release', $transferred), ['reason' => 'VENTA_CAIDA'])
            ->assertSessionHasErrors('reason');
        $this->assertSame($this->statusIds['TRANSFERIDO'], (int) $transferred->refresh()->lot_status_id);
    }

    public function test_release_requires_permission(): void
    {
        $user = User::factory()->create();
        $user->syncRoles([]);
        $lot = $this->reservedLot();

        $this->actingAs($user)
            ->post(route('inmopro.lots.release', $lot), ['reason' => 'VENTA_CAIDA'])
            ->assertForbidden();

        $this->assertSame($this->statusIds['RESERVADO'], (int) $lot->refresh()->lot_status_id);
    }

    /**
     * @param  list<int>  $exceptIds
     */
    private function reservedLot(string $statusCode = LotStatus::CODE_RESERVADO, array $exceptIds = []): Lot
    {
        $lot = Lot::query()->whereNotIn('id', $exceptIds)->firstOrFail();
        $client = Client::query()->firstOrFail();

        $lot->update([
            'lot_status_id' => $this->statusIds[$statusCode],
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_dni' => $client->dni,
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'sale_price' => 20000,
            'advance' => 2000,
            'remaining_balance' => 18000,
            'contract_date' => now()->toDateString(),
        ]);

        return $lot->fresh(['client']);
    }
}
