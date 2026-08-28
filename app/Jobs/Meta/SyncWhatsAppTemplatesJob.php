<?php

namespace App\Jobs\Meta;

use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaMessageTemplate;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

class SyncWhatsAppTemplatesJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $metaConnectionId) {}

    public function handle(): void
    {
        $connection = MetaConnection::query()->find($this->metaConnectionId);

        if (! $connection?->hasWhatsApp()) {
            return;
        }

        $token = $connection->getDecryptedAccessToken();
        $version = config('meta.graph_version');

        $response = Http::withToken((string) $token)->get(
            "https://graph.facebook.com/{$version}/{$connection->waba_id}/message_templates",
            ['limit' => 100],
        );

        if (! $response->successful()) {
            return;
        }

        foreach ($response->json('data') ?? [] as $template) {
            if (! is_array($template)) {
                continue;
            }

            MetaMessageTemplate::query()->updateOrCreate(
                [
                    'meta_connection_id' => $connection->id,
                    'template_name' => (string) ($template['name'] ?? ''),
                    'language' => (string) ($template['language'] ?? 'es'),
                ],
                [
                    'status' => (string) ($template['status'] ?? 'APPROVED'),
                    'category' => $template['category'] ?? null,
                    'components' => $template['components'] ?? [],
                ],
            );
        }

        $connection->update(['last_synced_at' => now()]);
    }
}
