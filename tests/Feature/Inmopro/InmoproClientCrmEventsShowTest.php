<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\User;
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

class InmoproClientCrmEventsShowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(ClientStatusSeeder::class);
        $this->seed(ClientTagSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_client_show_includes_crm_events(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::firstOrFail();
        $client = Client::create([
            'name' => 'Cliente Historial',
            'dni' => '84445566',
            'phone' => '955566677',
            'client_type_id' => ClientType::query()->where('code', 'PROPIO')->value('id'),
            'city_id' => City::firstOrFail()->id,
            'advisor_id' => $advisor->id,
        ]);

        app(ClientCrmService::class)->logEvent(
            $client,
            'whatsapp.message',
            ClientCrmService::SOURCE_CAZADOR,
            $advisor,
            meta: ['preview' => 'Hola desde el test', 'kind' => 'custom'],
        );

        $this->actingAs($user)
            ->get(route('inmopro.clients.show', $client))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/clients/show')
                ->has('client.crm_events', 1)
                ->where('client.crm_events.0.action', 'whatsapp.message')
                ->where('client.crm_events.0.meta.preview', 'Hola desde el test'));
    }
}
