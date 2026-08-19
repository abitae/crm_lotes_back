<?php

namespace Tests\Feature\Inmopro;

use App\Jobs\OpenAi\IndexCazadorKnowledge;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\OpenAiCazadorConfig;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OpenAiCazadorConfigTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('gcs');
        config([
            'openai_cazador.enabled' => true,
            'filesystems.default' => 'gcs',
            'cazador.default_storage_disk' => 'gcs',
        ]);
        OpenAiCazadorConfigResolver::forgetCache();
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
                'model' => 'gpt-5.4',
                'max_message_length' => 1500,
                'rate_limit' => 12,
                'knowledge_rate_limit' => 90,
            ])
            ->assertRedirect(route('inmopro.openai-cazador.edit'));

        $config = OpenAiCazadorConfig::current();

        $this->assertFalse($config->enabled);
        $this->assertSame('gpt-5.4', $config->model);
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
                'model' => 'gpt-5.4',
                'max_message_length' => 50,
                'rate_limit' => 0,
                'knowledge_rate_limit' => 0,
            ])
            ->assertSessionHasErrors(['max_message_length', 'rate_limit', 'knowledge_rate_limit']);
    }

    public function test_admin_can_upload_private_markdown_for_queued_indexing(): void
    {
        Queue::fake();
        Permission::findOrCreate('inmopro.openai-cazador.knowledge.upload', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.knowledge.upload');

        $this->actingAs($user)
            ->post(route('inmopro.openai-cazador.knowledge.upload'), [
                'expert_name' => 'Tim Villafuerte',
                'knowledge_file' => UploadedFile::fake()->createWithContent(
                    'conocimiento.md',
                    "# Empresa\nSomos una inmobiliaria orientada a familias.",
                ),
            ])
            ->assertSessionHasNoErrors();

        $document = OpenAiCazadorKnowledgeDocument::query()->firstOrFail();
        $this->assertSame('processing', $document->status);
        $this->assertSame('Tim Villafuerte', $document->expert_name);
        $this->assertSame($user->id, $document->uploaded_by);
        Storage::disk('gcs')->assertExists($document->storage_path);
        Queue::assertPushed(IndexCazadorKnowledge::class, fn ($job) => $job->documentId === $document->id);
    }

    public function test_upload_rejects_non_markdown_and_invalid_utf8(): void
    {
        Permission::findOrCreate('inmopro.openai-cazador.knowledge.upload', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.knowledge.upload');

        $this->actingAs($user)
            ->post(route('inmopro.openai-cazador.knowledge.upload'), [
                'expert_name' => 'Experto inválido',
                'knowledge_file' => UploadedFile::fake()->createWithContent('conocimiento.txt', '# Texto'),
            ])
            ->assertSessionHasErrors(['knowledge_file']);

        $this->actingAs($user)
            ->post(route('inmopro.openai-cazador.knowledge.upload'), [
                'expert_name' => 'Experto inválido',
                'knowledge_file' => UploadedFile::fake()->createWithContent('conocimiento.md', "# Empresa\n\xC3\x28"),
            ])
            ->assertSessionHasErrors(['knowledge_file']);

        $this->assertDatabaseCount('openai_cazador_knowledge_documents', 0);
    }

    public function test_ready_version_can_be_activated_atomically(): void
    {
        Permission::findOrCreate('inmopro.openai-cazador.knowledge.activate', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.knowledge.activate');
        $active = $this->knowledgeDocument(1, true, 'Tim Villafuerte');
        $replacement = $this->knowledgeDocument(2, false, 'Alex Day');
        $replacement->update(['evaluated_at' => now()]);

        $this->actingAs($user)
            ->post(route('inmopro.openai-cazador.knowledge.activate', $replacement))
            ->assertRedirect();

        $this->assertTrue($active->fresh()->is_active);
        $this->assertTrue($replacement->fresh()->is_active);
    }

    public function test_admin_can_upload_multiple_expert_documents_while_others_are_processing(): void
    {
        Queue::fake();
        Permission::findOrCreate('inmopro.openai-cazador.knowledge.upload', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('inmopro.openai-cazador.knowledge.upload');

        foreach (['Tim Villafuerte', 'Alex Day'] as $expert) {
            $this->actingAs($user)
                ->post(route('inmopro.openai-cazador.knowledge.upload'), [
                    'expert_name' => $expert,
                    'knowledge_file' => UploadedFile::fake()->createWithContent(
                        str($expert)->slug().'.md',
                        "# Ventas\nConocimiento comercial de {$expert}.",
                    ),
                ])
                ->assertSessionHasNoErrors();
        }

        $this->assertDatabaseCount('openai_cazador_knowledge_documents', 2);
        $this->assertEqualsCanonicalizing(
            ['Tim Villafuerte', 'Alex Day'],
            OpenAiCazadorKnowledgeDocument::query()->pluck('expert_name')->all(),
        );
        Queue::assertPushed(IndexCazadorKnowledge::class, 2);
    }

    private function knowledgeDocument(int $version, bool $active, string $expertName = 'Conocimiento general'): OpenAiCazadorKnowledgeDocument
    {
        return OpenAiCazadorKnowledgeDocument::query()->create([
            'version' => $version,
            'expert_name' => $expertName,
            'original_name' => "conocimiento-{$version}.md",
            'storage_path' => "openai-cazador/conocimiento-{$version}.md",
            'file_size' => 50,
            'sha256' => hash('sha256', (string) $version),
            'status' => 'ready',
            'is_active' => $active,
        ]);
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
