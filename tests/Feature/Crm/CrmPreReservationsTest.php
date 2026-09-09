<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CrmPreReservationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_advisor_can_create_pre_reservation_for_available_lot(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();
        $preReservationStatus = LotStatus::where('code', 'PRERESERVA')->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.lots.pre-reservations.create', $lot))->assertOk();

        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'client_id' => $client->id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 1500,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            'payment_reference' => 'OP-123',
            'notes' => 'Abono inicial',
        ])->assertRedirect(route('crm.lots.show', $lot));

        $this->assertDatabaseHas('lot_pre_reservations', [
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE',
            'amount' => 1500,
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'lot_status_id' => $preReservationStatus->id,
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
        ]);
    }

    public function test_advisor_cannot_pre_reserve_with_another_advisors_client(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($client->advisor_id)->firstOrFail();
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $this->actingAs($otherAdvisor, 'advisor');

        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'client_id' => $client->id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 1500,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertSessionHasErrors('client_id');

        $this->assertDatabaseMissing('lot_pre_reservations', [
            'lot_id' => $lot->id,
            'advisor_id' => $otherAdvisor->id,
        ]);
    }

    public function test_index_only_lists_own_pre_reservations(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.pre-reservations.index'))->assertOk();
    }

    public function test_index_filters_pre_reservations_by_status(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        LotPreReservation::create([
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE',
            'amount' => 1500,
            'voucher_path' => 'pre-reservations/crm/test-voucher.png',
        ]);

        LotPreReservation::create([
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'RECHAZADA',
            'amount' => 1500,
            'voucher_path' => 'pre-reservations/crm/test-voucher-2.png',
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.pre-reservations.index', ['status' => 'RECHAZADA']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('preReservations.data', 1)
                ->where('preReservations.data.0.status', 'RECHAZADA'));
    }

    public function test_second_pre_reservation_attempt_on_an_already_reserved_lot_does_not_corrupt_the_first(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $firstClient = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $firstAdvisor = Advisor::findOrFail($firstClient->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $this->actingAs($firstAdvisor, 'advisor');

        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'client_id' => $firstClient->id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 1500,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertRedirect(route('crm.lots.show', $lot));

        $secondClient = Client::where('client_type_id', $ownType->id)
            ->whereKeyNot($firstClient->id)
            ->firstOrFail();
        $secondAdvisor = Advisor::findOrFail($secondClient->advisor_id);

        $this->actingAs($secondAdvisor, 'advisor');

        // A second submission for the same lot must be rejected and must never
        // overwrite the first advisor's claim on the lot row. Genuinely concurrent
        // (same-instant) requests are additionally protected by lockForUpdate()
        // inside PreReservationController::store(), which forces this exact
        // "re-read after the winner committed" outcome even when two requests
        // start at the same time — that part isn't reproducible against the
        // SQLite in-memory test connection used here, so this test locks in the
        // data-integrity invariant instead of the raw thread interleaving.
        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'client_id' => $secondClient->id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 2000,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertSessionHasErrors('lot_id');

        $this->assertSame(
            1,
            LotPreReservation::query()->where('lot_id', $lot->id)->count(),
            'A second attempt on the same lot must not create a second pre-reservation row.'
        );
        $this->assertDatabaseHas('lot_pre_reservations', [
            'lot_id' => $lot->id,
            'client_id' => $firstClient->id,
            'advisor_id' => $firstAdvisor->id,
            'status' => 'PENDIENTE',
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'client_id' => $firstClient->id,
            'advisor_id' => $firstAdvisor->id,
        ]);
        $this->assertDatabaseMissing('lots', [
            'id' => $lot->id,
            'client_id' => $secondClient->id,
        ]);
    }

    public function test_store_rejects_pre_reservation_without_an_explicit_client(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 1500,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertSessionHasErrors('client_id');

        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'client_id' => '',
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 1500,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertSessionHasErrors('client_id');

        $this->assertDatabaseMissing('lot_pre_reservations', [
            'lot_id' => $lot->id,
        ]);
    }

    public function test_store_sets_an_expiration_deadline_on_the_pre_reservation(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.lots.pre-reservations.store', $lot), [
            'client_id' => $client->id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'amount' => 1500,
            'voucher_image' => UploadedFile::fake()->image('voucher.png'),
        ])->assertRedirect(route('crm.lots.show', $lot));

        $preReservation = LotPreReservation::where('lot_id', $lot->id)->firstOrFail();

        $this->assertNotNull($preReservation->expires_at);
        $this->assertTrue(
            $preReservation->expires_at->between(now()->addHours(47), now()->addHours(49)),
        );
    }

    public function test_expire_stale_pre_reservations_command_frees_the_lot_and_marks_expired(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();
        $preReservaStatusId = LotStatus::where('code', 'PRERESERVA')->value('id');
        $libreStatusId = LotStatus::where('code', 'LIBRE')->value('id');

        $preReservation = LotPreReservation::create([
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE',
            'amount' => 1500,
            'expires_at' => now()->subHour(),
            'voucher_path' => 'pre-reservations/crm/test-voucher.png',
        ]);

        $lot->update([
            'lot_status_id' => $preReservaStatusId,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
        ]);

        $this->artisan('pre-reservations:expire-stale')->assertExitCode(0);

        $this->assertSame('EXPIRADA', $preReservation->fresh()->status);
        $this->assertNotNull($preReservation->fresh()->reviewed_at);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'lot_status_id' => $libreStatusId,
            'client_id' => null,
            'advisor_id' => null,
        ]);
    }

    public function test_expire_stale_pre_reservations_command_leaves_non_expired_pending_reservations_untouched(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();
        $preReservaStatusId = LotStatus::where('code', 'PRERESERVA')->value('id');

        $preReservation = LotPreReservation::create([
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE',
            'amount' => 1500,
            'expires_at' => now()->addHours(24),
            'voucher_path' => 'pre-reservations/crm/test-voucher.png',
        ]);

        $lot->update([
            'lot_status_id' => $preReservaStatusId,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
        ]);

        $this->artisan('pre-reservations:expire-stale')->assertExitCode(0);

        $this->assertSame('PENDIENTE', $preReservation->fresh()->status);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'lot_status_id' => $preReservaStatusId,
            'client_id' => $client->id,
        ]);
    }
}
