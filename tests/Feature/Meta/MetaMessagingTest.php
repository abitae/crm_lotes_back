<?php

namespace Tests\Feature\Meta;

use App\Jobs\Meta\ProcessMetaWebhookJob;
use App\Models\Inmopro\Advisor;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;
use App\Models\Meta\MetaWebhookEvent;
use App\Services\Meta\MetaConnectionRouter;
use App\Services\Meta\MetaIngestService;
use App\Services\Meta\MetaOAuthService;
use App\Services\Meta\MetaWebhookVerifier;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTagSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MetaMessagingTest extends TestCase
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
        $this->seed(AdvisorSeeder::class);

        config([
            'meta.verify_token' => 'test_verify_token',
            'meta.app_secret' => 'test_secret',
        ]);
    }

    public function test_webhook_verify_returns_challenge(): void
    {
        $this->get('/webhooks/meta?hub_mode=subscribe&hub_verify_token=test_verify_token&hub_challenge=12345')
            ->assertOk()
            ->assertSee('12345');
    }

    public function test_webhook_verify_rejects_invalid_token(): void
    {
        $this->get('/webhooks/meta?hub_mode=subscribe&hub_verify_token=wrong&hub_challenge=12345')
            ->assertForbidden();
    }

    public function test_webhook_receive_dispatches_job(): void
    {
        Queue::fake();

        $payload = json_encode(['object' => 'whatsapp_business_account', 'entry' => []]);
        $signature = 'sha256='.hash_hmac('sha256', $payload, 'test_secret');

        $this->postJson('/webhooks/meta', json_decode($payload, true), [
            'X-Hub-Signature-256' => $signature,
        ])->assertOk();

        Queue::assertPushed(ProcessMetaWebhookJob::class);
    }

    public function test_connection_router_resolves_whatsapp_phone_number(): void
    {
        $advisor = Advisor::firstOrFail();

        MetaConnection::query()->create([
            'advisor_id' => $advisor->id,
            'status' => MetaConnection::STATUS_ACTIVE,
            'phone_number_id' => '123456789',
            'access_token' => 'token',
        ]);

        $router = app(MetaConnectionRouter::class);

        $connection = $router->resolveFromWebhookPayload([
            'object' => 'whatsapp_business_account',
            'entry' => [[
                'changes' => [[
                    'field' => 'messages',
                    'value' => [
                        'metadata' => ['phone_number_id' => '123456789'],
                        'messages' => [],
                    ],
                ]],
            ]],
        ]);

        $this->assertNotNull($connection);
        $this->assertSame($advisor->id, $connection->advisor_id);
    }

    public function test_ingest_deduplicates_webhook_events(): void
    {
        $advisor = Advisor::firstOrFail();

        MetaConnection::query()->create([
            'advisor_id' => $advisor->id,
            'status' => MetaConnection::STATUS_ACTIVE,
            'phone_number_id' => '999888777',
            'waba_id' => 'waba1',
            'access_token' => 'token',
        ]);

        $payload = [
            'object' => 'whatsapp_business_account',
            'entry' => [[
                'changes' => [[
                    'field' => 'messages',
                    'value' => [
                        'metadata' => ['phone_number_id' => '999888777'],
                        'contacts' => [['profile' => ['name' => 'Juan Test']]],
                        'messages' => [[
                            'id' => 'wamid.TEST123',
                            'from' => '51999888777',
                            'timestamp' => '1234567890',
                            'type' => 'text',
                            'text' => ['body' => 'Hola'],
                        ]],
                    ],
                ]],
            ]],
        ];

        $service = app(MetaIngestService::class);
        $service->ingest($payload);
        $service->ingest($payload);

        $this->assertSame(1, MetaWebhookEvent::query()->count());
        $this->assertSame(1, MetaMessage::query()->where('external_id', 'wamid.TEST123')->count());
        $this->assertSame(1, MetaConversation::query()->where('advisor_id', $advisor->id)->count());
    }

    public function test_meta_token_is_encrypted_at_rest(): void
    {
        $advisor = Advisor::firstOrFail();

        $connection = MetaConnection::query()->create([
            'advisor_id' => $advisor->id,
            'status' => MetaConnection::STATUS_ACTIVE,
            'access_token' => 'plain-token-value',
        ]);

        $this->assertNotSame('plain-token-value', $connection->getAttributes()['access_token']);
        $this->assertSame('plain-token-value', $connection->getDecryptedAccessToken());
    }

    public function test_oauth_status_for_advisor_without_connection(): void
    {
        $advisor = Advisor::firstOrFail();
        $status = app(MetaOAuthService::class)->statusForAdvisor($advisor);

        $this->assertFalse($status['connected']);
    }

    public function test_inbox_requires_meta_connection(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.inbox.index'))
            ->assertRedirect(route('crm.profile.edit'));
    }

    public function test_inbox_accessible_when_meta_connected(): void
    {
        $advisor = Advisor::firstOrFail();

        MetaConnection::query()->create([
            'advisor_id' => $advisor->id,
            'status' => MetaConnection::STATUS_ACTIVE,
            'phone_number_id' => '111',
            'access_token' => 'token',
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.inbox.index'))->assertOk();
    }

    public function test_webhook_verifier_signature_validation(): void
    {
        $verifier = app(MetaWebhookVerifier::class);
        $payload = '{"test":true}';
        $signature = 'sha256='.hash_hmac('sha256', $payload, 'test_secret');

        $this->assertTrue($verifier->verifySignature($payload, $signature));
        $this->assertFalse($verifier->verifySignature($payload, 'sha256=invalid'));
    }
}
