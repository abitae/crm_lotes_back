<?php

namespace Tests\Feature\OpenAi\Cazador;

use App\Models\Inmopro\Advisor;
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
