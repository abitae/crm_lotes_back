<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotStatus;
use App\Models\User;
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
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InmoproLotPreReservationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
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

    public function test_authenticated_users_can_visit_pre_reservations_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.lot-pre-reservations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/lot-pre-reservations/index')->has('preReservations'));
    }

    public function test_authenticated_users_can_approve_pre_reservation(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();
        $client = Client::firstOrFail();
        $advisor = Advisor::firstOrFail();
        $preReservationStatus = LotStatus::where('code', 'PRERESERVA')->firstOrFail();
        $reservedStatus = LotStatus::where('code', 'RESERVADO')->firstOrFail();

        $lot->update([
            'lot_status_id' => $preReservationStatus->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
        ]);

        $preReservation = LotPreReservation::create([
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'status' => 'PENDIENTE',
            'amount' => 1800,
            'voucher_path' => 'cazador/pre-reservations/test.png',
        ]);

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.approve', $preReservation), [
                'review_notes' => 'Voucher validado y monto conforme.',
                'sale_price' => 32000,
            ])
            ->assertRedirect(route('inmopro.lot-pre-reservations.index'));

        $this->assertDatabaseHas('lot_pre_reservations', [
            'id' => $preReservation->id,
            'status' => 'APROBADA',
            'notes' => 'Voucher validado y monto conforme.',
            'reviewed_by' => $user->id,
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'lot_status_id' => $reservedStatus->id,
            'sale_price' => 32000,
        ]);
    }

    public function test_authenticated_users_can_register_multiple_pre_reservations_for_existing_client(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $lots = $this->freeLotsAcrossProjects(3);
        $client = $this->ownClientForAdvisor();
        $preReservationStatus = LotStatus::where('code', 'PRERESERVA')->firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.store'), [
                'lot_ids' => $lots->pluck('id')->all(),
                'advisor_id' => $client->advisor_id,
                'client_id' => $client->id,
                'amount' => 1000,
                'payment_reference' => 'OPER-2026-001',
                'notes' => 'Registro masivo desde bandeja administrativa.',
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertRedirect(route('inmopro.lot-pre-reservations.index'));

        $preReservations = LotPreReservation::query()
            ->whereIn('lot_id', $lots->pluck('id'))
            ->orderBy('id')
            ->get();

        $this->assertCount(3, $preReservations);
        $this->assertSame(['333.33', '333.33', '333.34'], $preReservations->map(fn (LotPreReservation $preReservation): string => (string) $preReservation->amount)->all());
        $this->assertSame(1, $preReservations->pluck('voucher_path')->unique()->count());

        foreach ($lots as $lot) {
            $lot->refresh();
            $this->assertSame((int) $preReservationStatus->id, (int) $lot->lot_status_id);
            $this->assertSame((int) $client->id, (int) $lot->client_id);
            $this->assertSame((int) $client->advisor_id, (int) $lot->advisor_id);
            $this->assertSame($client->dni, $lot->client_dni);
        }

        Storage::disk('public')->assertExists($preReservations->firstOrFail()->voucher_path);
    }

    public function test_authenticated_users_can_register_pre_reservations_with_new_client(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $advisor = Advisor::firstOrFail();
        $lot = $this->freeLotsAcrossProjects(1)->firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.store'), [
                'lot_ids' => [$lot->id],
                'advisor_id' => $advisor->id,
                'new_client' => [
                    'name' => 'Cliente Nuevo Pre Reserva',
                    'dni' => '76543210',
                    'phone' => '977777777',
                ],
                'amount' => 750,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertRedirect(route('inmopro.lot-pre-reservations.index'));

        $client = Client::query()->where('dni', '76543210')->firstOrFail();

        $this->assertSame((int) $advisor->id, (int) $client->advisor_id);
        $this->assertSame('PROPIO', $client->type()->value('code'));
        $this->assertDatabaseHas('lot_pre_reservations', [
            'lot_id' => $lot->id,
            'client_id' => $client->id,
            'advisor_id' => $advisor->id,
            'amount' => 750,
            'status' => 'PENDIENTE',
        ]);
    }

    public function test_registering_pre_reservation_fails_when_any_lot_is_not_free(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $lots = $this->freeLotsAcrossProjects(2);
        $reservedStatus = LotStatus::where('code', 'RESERVADO')->firstOrFail();
        $client = $this->ownClientForAdvisor();
        $lots->last()->update(['lot_status_id' => $reservedStatus->id]);

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.store'), [
                'lot_ids' => $lots->pluck('id')->all(),
                'advisor_id' => $client->advisor_id,
                'client_id' => $client->id,
                'amount' => 500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertSessionHasErrors('lot_ids');

        $this->assertDatabaseMissing('lot_pre_reservations', [
            'lot_id' => $lots->first()->id,
        ]);
    }

    public function test_registering_pre_reservation_fails_when_client_does_not_belong_to_advisor(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $lot = $this->freeLotsAcrossProjects(1)->firstOrFail();
        $client = $this->ownClientForAdvisor();
        $otherAdvisor = Advisor::query()->whereKeyNot($client->advisor_id)->firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.store'), [
                'lot_ids' => [$lot->id],
                'advisor_id' => $otherAdvisor->id,
                'client_id' => $client->id,
                'amount' => 500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertSessionHasErrors('client_id');
    }

    public function test_registering_new_client_fails_when_dni_or_phone_already_exists(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $lot = $this->freeLotsAcrossProjects(1)->firstOrFail();
        $existingClient = $this->ownClientForAdvisor();

        $this->actingAs($user)
            ->post(route('inmopro.lot-pre-reservations.store'), [
                'lot_ids' => [$lot->id],
                'advisor_id' => $existingClient->advisor_id,
                'new_client' => [
                    'name' => 'Cliente Duplicado',
                    'dni' => $existingClient->dni,
                    'phone' => '966666666',
                ],
                'amount' => 500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertSessionHasErrors('duplicate_registration');
    }

    /**
     * @return Collection<int, Lot>
     */
    private function freeLotsAcrossProjects(int $count): Collection
    {
        $freeStatus = LotStatus::where('code', 'LIBRE')->firstOrFail();

        return Lot::query()
            ->whereHas('project', fn ($query) => $query->where('is_active', true))
            ->orderBy('project_id')
            ->orderBy('id')
            ->get()
            ->groupBy('project_id')
            ->flatMap(fn (Collection $lots): Collection => $lots->take(1))
            ->take($count)
            ->values()
            ->each(function (Lot $lot) use ($freeStatus): void {
                $lot->update([
                    'lot_status_id' => $freeStatus->id,
                    'client_id' => null,
                    'advisor_id' => null,
                    'client_name' => null,
                    'client_dni' => null,
                ]);
            });
    }

    private function ownClientForAdvisor(): Client
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $advisor = Advisor::firstOrFail();

        return Client::query()->create([
            'name' => 'Cliente Propio Test',
            'dni' => '70000001',
            'phone' => '900000001',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
