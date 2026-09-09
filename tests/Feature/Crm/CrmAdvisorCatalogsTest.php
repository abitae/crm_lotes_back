<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaContactIdentity;
use App\Services\Crm\AdvisorCrmCatalogService;
use App\Services\Meta\ContactMatcherService;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmAdvisorCatalogsTest extends TestCase
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

    public function test_each_advisor_gets_own_default_nuevo_with_distinct_ids(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $other = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $catalog = app(AdvisorCrmCatalogService::class);
        $catalog->ensureDefaults($advisor);
        $catalog->ensureDefaults($other);

        $nuevoA = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'NUEVO')->firstOrFail();
        $nuevoB = ClientStatus::query()->forAdvisor($other->id)->where('code', 'NUEVO')->firstOrFail();

        $this->assertNotSame($nuevoA->id, $nuevoB->id);
        $this->assertSame($advisor->id, $nuevoA->advisor_id);
        $this->assertSame($other->id, $nuevoB->advisor_id);
    }

    public function test_advisor_can_create_status_and_tag_from_crm_pipeline(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.pipeline.statuses.store'), [
            'name' => 'En espera',
            'color' => '#123456',
        ])->assertRedirect();

        $this->post(route('crm.pipeline.tags.store'), [
            'name' => 'Prioridad',
            'color' => '#654321',
        ])->assertRedirect();

        $this->assertDatabaseHas('client_statuses', [
            'advisor_id' => $advisor->id,
            'name' => 'En espera',
            'code' => 'EN_ESPERA',
        ]);
        $this->assertDatabaseHas('client_tags', [
            'advisor_id' => $advisor->id,
            'name' => 'Prioridad',
            'code' => 'PRIORIDAD',
        ]);
    }

    public function test_pipeline_index_only_lists_own_catalog(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $other = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $foreign = ClientStatus::query()->create([
            'advisor_id' => $other->id,
            'name' => 'Ajeno',
            'code' => 'AJENO_PIPELINE',
            'color' => '#000000',
            'sort_order' => 99,
            'is_active' => true,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.pipeline.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('crm/pipeline/index')
                ->has('statuses')
                ->where('statuses', fn ($statuses) => collect($statuses)->contains('id', $foreign->id) === false));
    }

    public function test_cannot_update_or_delete_another_advisors_status(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $other = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $foreign = ClientStatus::query()->forAdvisor($other->id)->where('code', 'NUEVO')->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->put(route('crm.pipeline.statuses.update', $foreign), [
            'name' => 'Hackeado',
        ])->assertNotFound();

        $this->delete(route('crm.pipeline.statuses.destroy', $foreign))->assertNotFound();
    }

    public function test_cannot_delete_status_assigned_to_clients(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'NUEVO')->firstOrFail();
        $this->createClientForAdvisor($advisor, $status->id);

        $this->actingAs($advisor, 'advisor');

        $this->delete(route('crm.pipeline.statuses.destroy', $status))
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('client_statuses', ['id' => $status->id]);
    }

    public function test_kanban_only_receives_own_statuses(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $other = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $foreign = ClientStatus::query()->create([
            'advisor_id' => $other->id,
            'name' => 'Kanban ajeno',
            'code' => 'KANBAN_AJENO',
            'color' => '#ff0000',
            'sort_order' => 80,
            'is_active' => true,
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.clients.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('statuses', fn ($statuses) => collect($statuses)->contains('id', $foreign->id) === false)
                ->where('statuses', fn ($statuses) => collect($statuses)->contains('code', 'NUEVO')));
    }

    public function test_crm_can_assign_own_tag_to_client(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $tag = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'CONTACTADO')->firstOrFail();

        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.clients.crm.update', $client), [
            'client_status_id' => $status->id,
            'tag_ids' => [$tag->id],
        ])->assertRedirect();

        $this->assertTrue($client->fresh()->tags->contains('id', $tag->id));
    }

    public function test_meta_assigns_whatsapp_tag_of_thread_owner(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $other = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        app(AdvisorCrmCatalogService::class)->ensureDefaults($advisor);
        app(AdvisorCrmCatalogService::class)->ensureDefaults($other);

        $connection = MetaConnection::query()->create([
            'advisor_id' => $advisor->id,
            'status' => MetaConnection::STATUS_ACTIVE,
            'phone_number_id' => '111222333',
            'access_token' => 'token',
        ]);
        $connection->load('advisor');

        $identity = MetaContactIdentity::query()->create([
            'meta_connection_id' => $connection->id,
            'advisor_id' => $advisor->id,
            'channel' => 'whatsapp',
            'external_user_id' => '51999111222',
            'phone' => '51999111222',
            'phone_normalized' => '51999111222',
            'profile_name' => 'Prospecto Meta',
        ]);

        $result = app(ContactMatcherService::class)->matchOrCreate($connection, $identity, 'Prospecto Meta');
        $client = $result['client'];

        $this->assertNotNull($client);
        $ownWhatsapp = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $otherWhatsapp = ClientTag::query()->forAdvisor($other->id)->where('code', 'WHATSAPP')->firstOrFail();

        $this->assertTrue($client->tags->contains('id', $ownWhatsapp->id));
        $this->assertFalse($client->tags->contains('id', $otherWhatsapp->id));
        $this->assertSame(
            ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'NUEVO')->value('id'),
            $client->client_status_id,
        );
    }

    private function createClientForAdvisor(Advisor $advisor, ?int $statusId = null): Client
    {
        return Client::query()->create([
            'name' => 'Cliente catalogo '.$advisor->id,
            'dni' => (string) (84000000 + $advisor->id),
            'phone' => '98555'.str_pad((string) $advisor->id, 4, '0', STR_PAD_LEFT),
            'client_type_id' => ClientType::query()->where('code', 'PROPIO')->value('id'),
            'city_id' => City::query()->firstOrFail()->id,
            'advisor_id' => $advisor->id,
            'client_status_id' => $statusId,
        ]);
    }
}
