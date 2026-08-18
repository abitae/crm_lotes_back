<?php

namespace Tests\Feature\OpenAi\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\OpenAiCazadorConversation;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use App\OpenAi\Agents\CazadorCatalogAssistant;
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
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['openai_cazador.enabled' => true]);
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_chat_requires_authentication(): void
    {
        $this->postJson(route('api.v1.cazador.openai.chat.store'), [
            'message' => '¿Qué proyectos hay?',
        ])->assertUnauthorized();
    }

    public function test_chat_returns_service_unavailable_when_module_disabled(): void
    {
        config(['openai_cazador.enabled' => false]);
        $advisor = Advisor::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => 'Hola',
            ])
            ->assertStatus(503);
    }

    public function test_advisor_receives_reply_when_agent_is_faked(): void
    {
        CazadorCatalogAssistant::fake(['Tenemos varios proyectos activos en el catálogo.']);

        $advisor = Advisor::firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => '¿Qué proyectos activos hay disponibles?',
            ])
            ->assertOk()
            ->assertJsonStructure(['reply', 'conversation_id']);

        $response->assertJson([
            'reply' => 'Tenemos varios proyectos activos en el catálogo.',
        ]);

        CazadorCatalogAssistant::assertPrompted(function ($prompt) {
            return $prompt->contains('proyectos activos');
        });
    }

    public function test_message_must_not_exceed_max_length(): void
    {
        CazadorCatalogAssistant::fake();

        $advisor = Advisor::firstOrFail();
        $max = (int) config('openai_cazador.max_message_length', 2000);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => str_repeat('a', $max + 1),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);
    }

    public function test_personal_data_is_rejected_before_prompting_openai(): void
    {
        CazadorCatalogAssistant::fake()->preventStrayPrompts();
        $advisor = Advisor::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => 'Escribe a cliente@example.com para coordinar',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);

        CazadorCatalogAssistant::assertNeverPrompted();
        $this->assertDatabaseCount('openai_cazador_conversations', 0);
    }

    public function test_conversation_is_persisted_and_isolated_per_advisor(): void
    {
        CazadorCatalogAssistant::fake(['Primera respuesta', 'Segunda respuesta']);
        $advisors = Advisor::query()->take(2)->get();
        $owner = $advisors->firstOrFail();
        $other = $advisors->last();
        $ownerToken = $this->loginToken($owner);

        $conversationId = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson(route('api.v1.cazador.openai.chat.store'), ['message' => 'Primera pregunta'])
            ->assertOk()
            ->json('conversation_id');

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => 'Segunda pregunta',
                'conversation_id' => $conversationId,
            ])
            ->assertOk()
            ->assertJsonPath('conversation_id', $conversationId);

        $this->assertDatabaseCount('openai_cazador_conversation_messages', 4);
        $this->assertDatabaseCount('openai_cazador_runs', 2);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($other))
            ->deleteJson(route('api.v1.cazador.openai.conversations.destroy', $conversationId))
            ->assertNotFound();
    }

    public function test_expired_conversation_is_replaced(): void
    {
        CazadorCatalogAssistant::fake(['Respuesta nueva']);
        $advisor = Advisor::firstOrFail();
        $old = OpenAiCazadorConversation::query()->create([
            'advisor_id' => $advisor->id,
            'last_active_at' => now()->subMinutes(121),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => 'Continuemos',
                'conversation_id' => $old->id,
            ])
            ->assertOk()
            ->assertJsonPath('conversation_reset', true);

        $this->assertNotSame($old->id, $response->json('conversation_id'));
        $this->assertDatabaseMissing('openai_cazador_conversations', ['id' => $old->id]);
    }

    public function test_status_exposes_dynamic_limit_and_active_knowledge_version(): void
    {
        config(['openai_cazador.max_message_length' => 1350]);
        $advisor = Advisor::firstOrFail();
        OpenAiCazadorKnowledgeDocument::query()->create([
            'version' => 3,
            'original_name' => 'ventas.md',
            'storage_path' => 'private/ventas.md',
            'file_size' => 100,
            'sha256' => str_repeat('a', 64),
            'status' => 'ready',
            'is_active' => true,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.status'))
            ->assertOk()
            ->assertJsonPath('max_message_length', 1350)
            ->assertJsonPath('knowledge.version', 3)
            ->assertJsonPath('knowledge.ready', true);
    }

    public function test_chat_is_rate_limited_per_advisor(): void
    {
        CazadorCatalogAssistant::fake(['ok']);

        $advisor = Advisor::firstOrFail();
        $token = $this->loginToken($advisor);
        $limit = (int) config('openai_cazador.rate_limit', 8);

        for ($i = 0; $i < $limit; $i++) {
            $this->withHeader('Authorization', 'Bearer '.$token)
                ->postJson(route('api.v1.cazador.openai.chat.store'), [
                    'message' => 'Consulta '.$i,
                ])
                ->assertOk();
        }

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => 'Una más',
            ])
            ->assertStatus(429);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertOk()->json('token');
    }
}
