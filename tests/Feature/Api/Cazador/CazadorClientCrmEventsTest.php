<?php

namespace Tests\Feature\Api\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientType;
use App\Services\Inmopro\ClientCrmService;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTagSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CazadorClientCrmEventsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(ClientStatusSeeder::class);
        $this->seed(ClientTagSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_change_status_writes_status_change_and_crm_event(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $status = ClientStatus::query()->where('code', 'CONTACTADO')->firstOrFail();

        app(ClientCrmService::class)->changeStatus($client, $status->id, $advisor);

        $this->assertDatabaseHas('client_status_changes', [
            'client_id' => $client->id,
            'to_status_id' => $status->id,
            'advisor_id' => $advisor->id,
        ]);
        $this->assertDatabaseHas('client_crm_events', [
            'client_id' => $client->id,
            'action' => 'client.status_changed',
            'source' => 'cazador',
            'advisor_id' => $advisor->id,
        ]);
    }

    public function test_advisor_can_store_explicit_crm_event(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.cazador.clients.crm.events.store', $client), [
                'action' => 'whatsapp.message',
                'meta' => [
                    'preview' => 'Hola, recordatorio de visita',
                    'kind' => 'reminder',
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.action', 'whatsapp.message');

        $this->assertDatabaseHas('client_crm_events', [
            'client_id' => $client->id,
            'action' => 'whatsapp.message',
            'source' => 'cazador',
            'advisor_id' => $advisor->id,
        ]);
    }

    public function test_store_crm_event_requires_auth(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        $this->postJson(route('api.v1.cazador.clients.crm.events.store', $client), [
            'action' => 'client.opened',
        ])->assertUnauthorized();
    }

    public function test_store_crm_event_rejects_foreign_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $foreignClient = $this->createClientForAdvisor($otherAdvisor);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.crm.events.store', $foreignClient), [
                'action' => 'client.opened',
            ])
            ->assertNotFound();
    }

    public function test_store_crm_event_rejects_unknown_action(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.crm.events.store', $client), [
                'action' => 'client.created',
            ])
            ->assertStatus(422);
    }

    public function test_creating_client_logs_crm_event(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.clients.store'), [
                'name' => 'Nuevo CRM Event',
                'dni' => '81112233',
                'phone' => '999888777',
                'city_id' => $city->id,
            ])
            ->assertCreated();

        $client = Client::query()->where('dni', '81112233')->firstOrFail();
        $this->assertDatabaseHas('client_crm_events', [
            'client_id' => $client->id,
            'action' => 'client.created',
        ]);
    }

    public function test_reminder_payload_includes_client_phone(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.reminders.store'), [
                'client_id' => $client->id,
                'title' => 'Llamar',
                'remind_at' => now()->addDay()->toIso8601String(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.client.phone', $client->phone);

        $this->assertDatabaseHas('client_crm_events', [
            'client_id' => $client->id,
            'action' => 'reminder.created',
        ]);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->json('token');
    }

    private function createClientForAdvisor(Advisor $advisor): Client
    {
        return Client::create([
            'name' => 'Cliente CRM Event '.$advisor->id,
            'dni' => (string) (83000000 + $advisor->id),
            'phone' => '98654'.str_pad((string) $advisor->id, 4, '0', STR_PAD_LEFT),
            'client_type_id' => ClientType::query()->where('code', 'PROPIO')->value('id'),
            'city_id' => City::firstOrFail()->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
