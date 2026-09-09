<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmClientsScopingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_advisor_can_create_and_view_own_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $city = City::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $response = $this->post(route('crm.clients.store'), [
            'name' => 'Cliente CRM',
            'dni' => '76543210',
            'phone' => '987654321',
            'email' => 'cliente@crm.test',
            'city_id' => $city->id,
        ]);

        $client = Client::where('name', 'Cliente CRM')->firstOrFail();
        $response->assertRedirect(route('crm.clients.index'));

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente CRM',
            'advisor_id' => $advisor->id,
        ]);

        $this->get(route('crm.clients.show', $client))->assertOk();
    }

    public function test_advisor_cannot_view_another_advisors_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $client = Client::create([
            'name' => 'Cliente Ajeno',
            'dni' => '10000001',
            'phone' => '900000001',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.show', $client))->assertNotFound();
        $this->get(route('crm.clients.edit', $client))->assertNotFound();
        $this->put(route('crm.clients.update', $client), [
            'name' => 'Intento de edicion',
            'phone' => '900000001',
            'city_id' => $city->id,
        ])->assertNotFound();
    }

    public function test_advisor_cannot_register_client_with_duplicate_phone(): void
    {
        $ownerAdvisor = Advisor::firstOrFail();
        $advisor = Advisor::query()->whereKeyNot($ownerAdvisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        Client::create([
            'name' => 'Cliente existente',
            'dni' => '11110001',
            'phone' => '980000099',
            'client_type_id' => $ownType->id,
            'advisor_id' => $ownerAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.clients.store'), [
            'name' => 'Intento duplicado',
            'dni' => '87654321',
            'phone' => '980000099',
            'city_id' => $city->id,
        ])->assertSessionHasErrors(['phone', 'duplicate_registration']);

        $this->assertDatabaseMissing('clients', [
            'name' => 'Intento duplicado',
        ]);
    }

    public function test_index_only_lists_own_clients(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        Client::create([
            'name' => 'Cliente Propio Visible',
            'dni' => '20000001',
            'phone' => '900000011',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Cliente De Otro Vendedor',
            'dni' => '20000002',
            'phone' => '900000022',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.index'))->assertOk();
    }

    public function test_kanban_view_applies_search_filter(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        Client::create([
            'name' => 'Busqueda Kanban Alfa',
            'dni' => '20000010',
            'phone' => '900000101',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Otro Cliente Beta',
            'dni' => '20000011',
            'phone' => '900000102',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $response = $this->get(route('crm.clients.index', ['view' => 'kanban', 'search' => 'Alfa']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('kanbanClients', 1)
            ->where('kanbanClients.0.name', 'Busqueda Kanban Alfa'));
    }

    public function test_advisor_can_delete_own_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $client = Client::create([
            'name' => 'Cliente a eliminar',
            'dni' => '30000001',
            'phone' => '900000201',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->delete(route('crm.clients.destroy', $client))
            ->assertRedirect(route('crm.clients.index'));

        $this->assertModelMissing($client);
    }

    public function test_advisor_cannot_delete_another_advisors_client(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        $client = Client::create([
            'name' => 'Cliente ajeno a eliminar',
            'dni' => '30000002',
            'phone' => '900000202',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->delete(route('crm.clients.destroy', $client))->assertNotFound();

        $this->assertModelExists($client);
    }

    public function test_index_filters_by_one_or_more_tags(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $whatsapp = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $hot = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'CALIENTE')->firstOrFail();

        $onlyWhatsapp = Client::create([
            'name' => 'Solo WhatsApp',
            'dni' => '40000001',
            'phone' => '900000301',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);
        $onlyWhatsapp->tags()->sync([$whatsapp->id]);

        $both = Client::create([
            'name' => 'WhatsApp y Caliente',
            'dni' => '40000002',
            'phone' => '900000302',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);
        $both->tags()->sync([$whatsapp->id, $hot->id]);

        Client::create([
            'name' => 'Sin etiquetas',
            'dni' => '40000003',
            'phone' => '900000303',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.index', [
            'view' => 'kanban',
            'tag_ids' => [$whatsapp->id],
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('kanbanClients', 2)
                ->where('filters.tag_ids', [$whatsapp->id]));

        $this->get(route('crm.clients.index', [
            'view' => 'kanban',
            'tag_ids' => [$whatsapp->id, $hot->id],
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('kanbanClients', 1)
                ->where('kanbanClients.0.name', 'WhatsApp y Caliente'));
    }

    public function test_advisor_can_assign_tags_from_clients_listing(): void
    {
        $advisor = Advisor::firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();
        $tag = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();

        $client = Client::create([
            'name' => 'Cliente para etiquetar',
            'dni' => '40000010',
            'phone' => '900000310',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->from(route('crm.clients.index'))
            ->patch(route('crm.clients.crm.update', $client), [
                'tag_ids' => [$tag->id],
            ])
            ->assertRedirect();

        $this->assertTrue($client->fresh()->tags->contains('id', $tag->id));
    }

    public function test_client_search_is_scoped_and_matches_name_dni_and_phone(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        Client::create([
            'name' => 'Zulema Perez',
            'dni' => '44556677',
            'phone' => '999111222',
            'client_type_id' => $ownType->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        Client::create([
            'name' => 'Zulema Ajena',
            'dni' => '44556678',
            'phone' => '999111223',
            'client_type_id' => $ownType->id,
            'advisor_id' => $otherAdvisor->id,
            'city_id' => $city->id,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->getJson(route('crm.clients.search'))
            ->assertOk()
            ->assertExactJson([]);

        $this->getJson(route('crm.clients.search', ['q' => 'Z']))
            ->assertOk()
            ->assertExactJson([]);

        $this->getJson(route('crm.clients.search', ['q' => 'Zu']))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Zulema Perez');

        $this->getJson(route('crm.clients.search', ['q' => '44556677']))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.dni', '44556677');

        $this->getJson(route('crm.clients.search', ['q' => '999111222']))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.phone', '999111222');
    }
}
