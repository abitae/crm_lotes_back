<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\OpenAiCazadorConfig;
use App\Models\User;
use App\Support\OpenAiCazadorConfigResolver;
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
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OpenAiCazadorConfigTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_user_with_permission_can_view_openai_cazador_settings(): void
    {
        Permission::findOrCreate('inmopro.openai-cazador.edit', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.edit');

        $this->actingAs($user)
            ->get(route('inmopro.openai-cazador.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/openai-cazador-settings')
                ->where('config.enabled', true)
                ->where('config.max_message_length', 2000));
    }

    public function test_user_without_permission_receives_403(): void
    {
        Permission::findOrCreate('inmopro.openai-cazador.edit', 'web');
        $user = User::factory()->create();
        $user->syncRoles([]);

        $this->actingAs($user)
            ->get(route('inmopro.openai-cazador.edit'))
            ->assertForbidden();
    }

    public function test_user_with_permission_can_update_settings(): void
    {
        Permission::findOrCreate('inmopro.openai-cazador.update', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.update');

        $this->actingAs($user)
            ->put(route('inmopro.openai-cazador.update'), [
                'enabled' => false,
                'model' => 'gpt-4o-mini',
                'max_message_length' => 1500,
                'rate_limit' => 12,
                'knowledge_rate_limit' => 90,
            ])
            ->assertRedirect(route('inmopro.openai-cazador.edit'));

        $config = OpenAiCazadorConfig::current();

        $this->assertFalse($config->enabled);
        $this->assertSame('gpt-4o-mini', $config->model);
        $this->assertSame(1500, $config->max_message_length);
        $this->assertSame(12, $config->rate_limit);
        $this->assertSame(90, $config->knowledge_rate_limit);
    }

    public function test_disabling_module_via_database_applies_to_api(): void
    {
        config(['openai_cazador.enabled' => true]);
        $this->seedMinimalCazadorData();

        OpenAiCazadorConfig::current()->update(['enabled' => false]);
        OpenAiCazadorConfigResolver::forgetCache();
        OpenAiCazadorConfigResolver::applyRuntimeConfig();

        $advisor = Advisor::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.openai.chat.store'), [
                'message' => 'Hola',
            ])
            ->assertStatus(503);
    }

    public function test_update_validates_numeric_limits(): void
    {
        Permission::findOrCreate('inmopro.openai-cazador.update', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.update');

        $this->actingAs($user)
            ->put(route('inmopro.openai-cazador.update'), [
                'enabled' => true,
                'model' => null,
                'max_message_length' => 50,
                'rate_limit' => 0,
                'knowledge_rate_limit' => 0,
            ])
            ->assertSessionHasErrors(['max_message_length', 'rate_limit', 'knowledge_rate_limit']);
    }

    private function seedMinimalCazadorData(): void
    {
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

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertOk()->json('token');
    }
}
