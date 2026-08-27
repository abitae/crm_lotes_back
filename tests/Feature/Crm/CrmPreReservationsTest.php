<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
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
        ])->assertRedirect(route('crm.pre-reservations.index'));

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
}
