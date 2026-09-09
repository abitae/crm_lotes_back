<?php

namespace Tests\Feature\Api\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTagSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CazadorClientCrmTest extends TestCase
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

    public function test_advisor_can_list_statuses_and_tags(): void
    {
        $advisor = Advisor::firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.client-statuses.index'))
            ->assertOk()
            ->assertJsonFragment(['code' => 'NUEVO']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.client-tags.index'))
            ->assertOk()
            ->assertJsonFragment(['code' => 'CALIENTE']);
    }

    public function test_advisor_can_update_client_crm_fields(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'CONTACTADO')->firstOrFail();
        $tag = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson(route('api.v1.cazador.clients.crm.update', $client), [
                'client_status_id' => $status->id,
                'tag_ids' => [$tag->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.status.code', 'CONTACTADO')
            ->assertJsonPath('data.tags.0.code', 'WHATSAPP');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'client_status_id' => $status->id,
        ]);
        $this->assertDatabaseHas('client_client_tag', [
            'client_id' => $client->id,
            'client_tag_id' => $tag->id,
        ]);
        $this->assertDatabaseHas('client_status_changes', [
            'client_id' => $client->id,
            'to_status_id' => $status->id,
            'advisor_id' => $advisor->id,
        ]);
    }

    public function test_completing_reminder_can_apply_status_and_tags(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'NEGOCIACION')->firstOrFail();
        $tag = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'CALIENTE')->firstOrFail();
        $reminder = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Visita',
            'remind_at' => now()->subHour(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.reminders.complete', $reminder), [
                'client_status_id' => $status->id,
                'tag_ids' => [$tag->id],
            ])
            ->assertOk();

        $this->assertNotNull($reminder->fresh()->completed_at);
        $this->assertSame($status->id, $client->fresh()->client_status_id);
        $this->assertTrue($client->fresh()->tags->contains('id', $tag->id));
        $this->assertDatabaseHas('client_status_changes', [
            'client_id' => $client->id,
            'to_status_id' => $status->id,
            'reminder_id' => $reminder->id,
        ]);
    }

    public function test_clients_index_can_filter_by_status_and_tag(): void
    {
        $advisor = Advisor::firstOrFail();
        $status = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'INTERESADO')->firstOrFail();
        $tag = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'REFERIDO')->firstOrFail();
        $matching = $this->createClientForAdvisor($advisor);
        $matching->forceFill(['client_status_id' => $status->id])->save();
        $matching->tags()->sync([$tag->id]);

        $other = Client::create([
            'name' => 'Otro cliente',
            'dni' => '90000001',
            'phone' => '911111111',
            'client_type_id' => ClientType::query()->where('code', 'PROPIO')->value('id'),
            'city_id' => City::firstOrFail()->id,
            'advisor_id' => $advisor->id,
        ]);

        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.clients.index', [
                'client_status_id' => $status->id,
                'tag_id' => $tag->id,
            ]))
            ->assertOk()
            ->assertJsonFragment(['id' => $matching->id])
            ->assertJsonMissing(['id' => $other->id]);
    }

    public function test_statuses_and_tags_index_only_returns_own_catalog(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $foreignStatus = ClientStatus::query()->create([
            'advisor_id' => $otherAdvisor->id,
            'name' => 'Solo otro',
            'code' => 'SOLO_OTRO',
            'color' => '#111111',
            'sort_order' => 99,
            'is_active' => true,
        ]);
        $ownStatus = ClientStatus::query()->forAdvisor($advisor->id)->where('code', 'NUEVO')->firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.cazador.client-statuses.index'))
            ->assertOk()
            ->assertJsonFragment(['id' => $ownStatus->id])
            ->assertJsonMissing(['id' => $foreignStatus->id]);
    }

    public function test_cannot_assign_another_advisors_status_or_tag(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $foreignStatus = ClientStatus::query()->forAdvisor($otherAdvisor->id)->where('code', 'CONTACTADO')->firstOrFail();
        $foreignTag = ClientTag::query()->forAdvisor($otherAdvisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $token = $this->loginToken($advisor);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson(route('api.v1.cazador.clients.crm.update', $client), [
                'client_status_id' => $foreignStatus->id,
                'tag_ids' => [$foreignTag->id],
            ])
            ->assertStatus(422);
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
            'name' => 'Cliente CRM '.$advisor->id,
            'dni' => (string) (82000000 + $advisor->id),
            'phone' => '98765'.str_pad((string) $advisor->id, 4, '0', STR_PAD_LEFT),
            'client_type_id' => ClientType::query()->where('code', 'PROPIO')->value('id'),
            'city_id' => City::firstOrFail()->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
