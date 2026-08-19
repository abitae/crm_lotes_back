<?php

namespace Tests\Feature\Api\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
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

class CazadorPreReservationsTest extends TestCase
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

    public function test_advisor_can_create_pre_reservation_for_available_lot(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();
        $preReservationStatus = LotStatus::where('code', 'PRERESERVA')->firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->withHeader('Accept', 'application/json')
            ->post(route('api.v1.cazador.lots.pre-reservations.store', $lot), [
                'client_id' => $client->id,
                'project_id' => $lot->project_id,
                'lot_id' => $lot->id,
                'amount' => 1500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
                'payment_reference' => 'OP-123',
                'notes' => 'Abono inicial',
            ])->assertCreated()
            ->assertJsonFragment(['status' => 'PENDIENTE'])
            ->assertJsonFragment(['amount' => '1500.00']);

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

    public function test_gcs_voucher_is_stored_once_and_returns_a_signed_url(): void
    {
        Storage::fake('gcs');
        config([
            'filesystems.default' => 'gcs',
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.temporary_urls.sensitive_ttl_minutes' => 10,
        ]);
        Storage::disk('gcs')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): string => 'https://signed.test/'.$path.'?expires='.$expiration->getTimestamp(),
        );

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->post(route('api.v1.cazador.lots.pre-reservations.store', $lot), [
                'client_id' => $client->id,
                'project_id' => $lot->project_id,
                'lot_id' => $lot->id,
                'amount' => 1500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])
            ->assertCreated();

        $path = LotPreReservation::query()->firstOrFail()->voucher_path;
        Storage::disk('gcs')->assertExists($path);
        $this->assertStringStartsWith('https://signed.test/pre-reservations/cazador/', $response->json('data.voucher_url'));
    }

    public function test_advisor_cannot_create_pre_reservation_when_lot_in_body_does_not_match_route(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lots = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->take(2)->get();
        $routeLot = $lots->first();
        $payloadLot = $lots->last();

        $this->assertNotNull($routeLot);
        $this->assertNotNull($payloadLot);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->withHeader('Accept', 'application/json')
            ->post(route('api.v1.cazador.lots.pre-reservations.store', $routeLot), [
                'client_id' => $client->id,
                'project_id' => $routeLot->project_id,
                'lot_id' => $payloadLot->id,
                'amount' => 1500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'El lote enviado no coincide con la ruta.']);
    }

    public function test_advisor_cannot_create_pre_reservation_for_non_available_lot(): void
    {
        Storage::fake('public');

        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::firstOrFail();
        $lot->update([
            'lot_status_id' => LotStatus::where('code', 'RESERVADO')->firstOrFail()->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->withHeader('Accept', 'application/json')
            ->post(route('api.v1.cazador.lots.pre-reservations.store', $lot), [
                'client_id' => $client->id,
                'project_id' => $lot->project_id,
                'lot_id' => $lot->id,
                'amount' => 1500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'La unidad no está disponible para pre-reserva.']);
    }

    public function test_advisor_can_create_pre_reservation_for_owned_datero_client(): void
    {
        Storage::fake('public');

        $dateroType = ClientType::where('code', 'DATERO')->firstOrFail();
        $client = Client::where('client_type_id', $dateroType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->withHeader('Accept', 'application/json')
            ->post(route('api.v1.cazador.lots.pre-reservations.store', $lot), [
                'client_id' => $client->id,
                'project_id' => $lot->project_id,
                'lot_id' => $lot->id,
                'amount' => 1500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])->assertCreated()
            ->assertJsonFragment(['status' => 'PENDIENTE']);
    }

    public function test_advisor_cannot_create_pre_reservation_for_non_operational_client_type(): void
    {
        Storage::fake('public');

        $invalidType = ClientType::where('code', 'PROSPECTO')->firstOrFail();
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $client = Client::create([
            'name' => 'Cliente prospecto pre-reserva',
            'dni' => '87654324',
            'phone' => '987000114',
            'email' => 'prospecto-prereserva@test.local',
            'advisor_id' => $advisor->id,
            'client_type_id' => $invalidType->id,
            'city_id' => $city->id,
        ]);
        $lot = Lot::whereHas('status', fn ($query) => $query->where('code', 'LIBRE'))->firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->withHeader('Accept', 'application/json')
            ->post(route('api.v1.cazador.lots.pre-reservations.store', $lot), [
                'client_id' => $client->id,
                'project_id' => $lot->project_id,
                'lot_id' => $lot->id,
                'amount' => 1500,
                'voucher_image' => UploadedFile::fake()->image('voucher.png'),
            ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.']);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->json('token');
    }
}
