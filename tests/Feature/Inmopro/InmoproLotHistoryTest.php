<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotHistory;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InmoproLotHistoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var array<string, int>
     */
    private array $statusIds;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);

        $this->statusIds = LotStatus::query()->pluck('id', 'code')->map(fn ($id) => (int) $id)->all();
    }

    public function test_creating_a_lot_records_created_event(): void
    {
        $lot = Lot::query()->firstOrFail();

        $this->assertTrue(LotHistory::query()
            ->where('lot_id', $lot->id)
            ->where('event', LotHistory::EVENT_CREATED)
            ->exists());
    }

    public function test_pre_reservation_approval_and_rejection_are_recorded(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        [$approvedLot, $rejectedLot] = Lot::query()
            ->where('lot_status_id', $this->statusIds['LIBRE'])
            ->take(2)
            ->get()
            ->all();

        foreach ([$approvedLot, $rejectedLot] as $lot) {
            $lot->update([
                'lot_status_id' => $this->statusIds['PRERESERVA'],
                'client_id' => $client->id,
                'client_name' => $client->name,
                'advisor_id' => $advisor->id,
            ]);
        }

        $approved = $this->preReservation($approvedLot, $client, $advisor);
        $rejected = $this->preReservation($rejectedLot, $client, $advisor);

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.approve', $approved), [
                'review_notes' => 'Conforme.',
                'sale_price' => 30000,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.reject', $rejected), [
                'rejection_reason' => 'Voucher ilegible',
            ])
            ->assertSessionHasNoErrors();

        $preReserved = LotHistory::query()
            ->where('lot_id', $approvedLot->id)
            ->where('event', LotHistory::EVENT_PRE_RESERVED)
            ->sole();
        $this->assertSame($client->id, $preReserved->client_id);

        $reserved = LotHistory::query()
            ->where('lot_id', $approvedLot->id)
            ->where('event', LotHistory::EVENT_RESERVED)
            ->sole();
        $this->assertSame($user->id, $reserved->user_id);
        $this->assertSame($this->statusIds['PRERESERVA'], $reserved->from_status_id);
        $this->assertSame($this->statusIds['RESERVADO'], $reserved->to_status_id);
        $this->assertSame($client->id, $reserved->client_id);
        $this->assertSame($advisor->name, $reserved->advisor_name);

        $released = LotHistory::query()
            ->where('lot_id', $rejectedLot->id)
            ->where('event', LotHistory::EVENT_PRE_RESERVATION_RELEASED)
            ->sole();
        $this->assertSame('Voucher ilegible', $released->reason);
        // The entry keeps who held the lot before it was freed.
        $this->assertSame($client->id, $released->client_id);
        $this->assertSame($this->statusIds['LIBRE'], $released->to_status_id);
    }

    public function test_expired_pre_reservation_is_recorded_without_user(): void
    {
        $client = Client::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $lot = Lot::query()->where('lot_status_id', $this->statusIds['LIBRE'])->firstOrFail();
        $lot->update([
            'lot_status_id' => $this->statusIds['PRERESERVA'],
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
        ]);
        $preReservation = $this->preReservation($lot, $client, $advisor);
        $preReservation->forceFill(['expires_at' => now()->subHour()])->save();

        $this->artisan('pre-reservations:expire-stale')->assertSuccessful();

        $released = LotHistory::query()
            ->where('lot_id', $lot->id)
            ->where('event', LotHistory::EVENT_PRE_RESERVATION_RELEASED)
            ->sole();
        $this->assertNull($released->user_id);
        $this->assertSame('Sistema', $released->user_name);
        $this->assertStringContainsString('Expiración automática', (string) $released->reason);
    }

    public function test_changes_made_by_an_advisor_session_record_the_advisor_name(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $lot = Lot::query()->where('lot_status_id', $this->statusIds['LIBRE'])->firstOrFail();

        $this->actingAs($advisor, 'advisor');
        auth()->shouldUse('advisor');
        $lot->update(['lot_status_id' => $this->statusIds['PRERESERVA'], 'advisor_id' => $advisor->id]);

        $history = LotHistory::query()
            ->where('lot_id', $lot->id)
            ->where('event', LotHistory::EVENT_PRE_RESERVED)
            ->sole();
        $this->assertNull($history->user_id);
        $this->assertSame($advisor->name.' (asesor)', $history->user_name);
    }

    public function test_lot_show_includes_history(): void
    {
        $user = User::factory()->create();
        $lot = Lot::query()->firstOrFail();
        $lot->update(['lot_status_id' => $this->statusIds['RESERVADO']]);

        $this->actingAs($user)
            ->get(route('inmopro.lots.show', $lot))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inmopro/lots/show')
                ->where('lot.histories.0.event', LotHistory::EVENT_RESERVED)
                ->where('lot.histories.0.event_label', 'Reservado')
                ->where('lot.histories.0.to_status.code', 'RESERVADO')
                ->where('canReleaseLot', true));
    }

    private function preReservation(Lot $lot, Client $client, Advisor $advisor): LotPreReservation
    {
        return LotPreReservation::create([
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE',
            'amount' => 1500,
            'voucher_path' => 'cazador/pre-reservations/test.png',
        ]);
    }
}
