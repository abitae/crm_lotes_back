<?php

namespace App\Services\Meta;

use App\Models\Inmopro\Advisor;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;
use App\Models\Meta\MetaMessageTemplate;
use App\Services\Inmopro\ClientCrmService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;

class MetaSendService
{
    public function __construct(
        private ClientCrmService $clientCrmService,
    ) {}

    public function sendText(MetaConversation $conversation, Advisor $advisor, string $body): MetaMessage
    {
        $connection = $conversation->metaConnection;

        if (! $connection?->isActive()) {
            throw new InvalidArgumentException('No tienes Meta conectado.');
        }

        if ($conversation->channel === 'whatsapp' && ! $conversation->isWithinWhatsAppWindow()) {
            throw new InvalidArgumentException('La ventana de 24 h de WhatsApp expiró. Usa una plantilla.');
        }

        $externalId = $this->dispatchToMeta($connection, $conversation, $body);

        $message = MetaMessage::query()->create([
            'conversation_id' => $conversation->id,
            'direction' => MetaMessage::DIRECTION_OUTBOUND,
            'content_type' => 'text',
            'body' => $body,
            'external_id' => $externalId,
            'status' => 'sent',
            'sent_by_advisor_id' => $advisor->id,
        ]);

        $conversation->update(['last_message_at' => now()]);

        if ($conversation->client) {
            $this->clientCrmService->logEvent(
                $conversation->client,
                'meta.message.outbound',
                ClientCrmService::SOURCE_CRM,
                $advisor,
                meta: [
                    'channel' => $conversation->channel,
                    'preview' => mb_substr($body, 0, 500),
                    'conversation_id' => $conversation->id,
                ],
            );
        }

        return $message;
    }

    public function sendTemplate(
        MetaConnection $connection,
        string $phone,
        MetaMessageTemplate $template,
        array $parameters = [],
    ): string {
        $token = $connection->getDecryptedAccessToken();
        $version = config('meta.graph_version');

        $response = Http::withToken((string) $token)->post(
            "https://graph.facebook.com/{$version}/{$connection->phone_number_id}/messages",
            [
                'messaging_product' => 'whatsapp',
                'to' => preg_replace('/\D+/', '', $phone),
                'type' => 'template',
                'template' => [
                    'name' => $template->template_name,
                    'language' => ['code' => $template->language],
                    'components' => $parameters !== [] ? [
                        [
                            'type' => 'body',
                            'parameters' => array_map(
                                fn (string $text) => ['type' => 'text', 'text' => $text],
                                $parameters,
                            ),
                        ],
                    ] : [],
                ],
            ],
        );

        if (! $response->successful()) {
            throw new InvalidArgumentException('No se pudo enviar la plantilla de WhatsApp.');
        }

        return (string) ($response->json('messages.0.id') ?? Str::uuid()->toString());
    }

    private function dispatchToMeta(
        MetaConnection $connection,
        MetaConversation $conversation,
        string $body,
    ): string {
        $token = $connection->getDecryptedAccessToken();
        $version = config('meta.graph_version');
        $identity = $conversation->contactIdentity;

        if ($conversation->channel === 'whatsapp') {
            $response = Http::withToken((string) $token)->post(
                "https://graph.facebook.com/{$version}/{$connection->phone_number_id}/messages",
                [
                    'messaging_product' => 'whatsapp',
                    'to' => $identity->external_user_id,
                    'type' => 'text',
                    'text' => ['body' => $body],
                ],
            );
        } else {
            $recipientId = $identity->external_user_id;
            $pageId = $connection->page_id;

            $response = Http::withToken((string) $token)->post(
                "https://graph.facebook.com/{$version}/{$pageId}/messages",
                [
                    'recipient' => ['id' => $recipientId],
                    'message' => ['text' => $body],
                    'messaging_type' => 'RESPONSE',
                ],
            );
        }

        if (! $response->successful()) {
            throw new InvalidArgumentException('Meta rechazó el envío del mensaje.');
        }

        return (string) ($response->json('messages.0.id') ?? Str::uuid()->toString());
    }
}
