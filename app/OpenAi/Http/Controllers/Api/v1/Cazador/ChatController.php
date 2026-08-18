<?php

namespace App\OpenAi\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\OpenAiCazadorConversation;
use App\Models\Inmopro\OpenAiCazadorConversationMessage;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use App\Models\Inmopro\OpenAiCazadorRun;
use App\OpenAi\Agents\CazadorCatalogAssistant;
use App\OpenAi\Http\Requests\Api\v1\Cazador\ChatRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Ai\Messages\Message;

class ChatController extends Controller
{
    public function store(ChatRequest $request): JsonResponse
    {
        $validated = $request->validated();
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        [$conversation, $reset] = $this->resolveConversation($advisor, $validated['conversation_id'] ?? null);
        $maxMessages = (int) config('openai_cazador.max_conversation_messages', 12);
        $history = $conversation->messages()->latest('id')->limit(max(0, $maxMessages - 1))->get()->reverse()->map(
            fn (OpenAiCazadorConversationMessage $item) => new Message($item->role, $item->content)
        )->values()->all();
        $startedAt = hrtime(true);

        try {
            $response = CazadorCatalogAssistant::make(history: $history)->prompt(
                (string) $validated['message'],
                model: 'gpt-5.4',
                timeout: 30,
            );

            $conversation->messages()->createMany([
                ['role' => 'user', 'content' => (string) $validated['message']],
                ['role' => 'assistant', 'content' => (string) $response],
            ]);
            $conversation->update(['last_active_at' => now()]);
            $this->recordRun($advisor, $conversation, $response, $startedAt, 'success');

            return response()->json([
                'reply' => (string) $response,
                'conversation_id' => $conversation->id,
                'conversation_reset' => $reset,
            ]);
        } catch (\Throwable $exception) {
            $this->recordRun($advisor, $conversation, null, $startedAt, 'failed', class_basename($exception));
            report($exception);

            return response()->json([
                'message' => 'El asistente no pudo responder en este momento. Inténtalo nuevamente.',
                'code' => 'ai_temporarily_unavailable',
            ], 503);
        }
    }

    public function status(): JsonResponse
    {
        $latest = OpenAiCazadorKnowledgeDocument::query()->latest('version')->first();
        $active = OpenAiCazadorKnowledgeDocument::active();

        return response()->json([
            'enabled' => (bool) config('openai_cazador.enabled'),
            'max_message_length' => (int) config('openai_cazador.max_message_length', 2000),
            'knowledge' => $latest ? [
                'version' => $active?->version,
                'status' => $latest->status,
                'ready' => $active !== null,
                'updating' => $latest->status === 'processing',
                'updated_at' => $active?->updated_at?->toIso8601String(),
            ] : ['version' => null, 'status' => 'missing', 'ready' => false, 'updated_at' => null],
        ]);
    }

    public function destroyConversation(Request $request, string $conversation): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->attributes->get('advisor');
        OpenAiCazadorConversation::query()->whereKey($conversation)->where('advisor_id', $advisor->id)->firstOrFail()->delete();

        return response()->json(['message' => 'Conversación eliminada.']);
    }

    /** @return array{OpenAiCazadorConversation, bool} */
    private function resolveConversation(Advisor $advisor, mixed $conversationId): array
    {
        if (is_string($conversationId) && $conversationId !== '') {
            $conversation = OpenAiCazadorConversation::query()->whereKey($conversationId)->where('advisor_id', $advisor->id)->firstOrFail();
            $ttlMinutes = (int) config('openai_cazador.conversation_ttl_minutes', 120);
            if ($conversation->last_active_at->greaterThanOrEqualTo(now()->subMinutes($ttlMinutes))) {
                return [$conversation, false];
            }
            $conversation->delete();
        }

        return [OpenAiCazadorConversation::query()->create(['advisor_id' => $advisor->id, 'last_active_at' => now()]), is_string($conversationId)];
    }

    private function recordRun(Advisor $advisor, OpenAiCazadorConversation $conversation, mixed $response, int $startedAt, string $status, ?string $errorCode = null): void
    {
        OpenAiCazadorRun::query()->create([
            'advisor_id' => $advisor->id,
            'conversation_id' => $conversation->id,
            'invocation_id' => $response?->invocationId,
            'status' => $status,
            'model' => $response?->meta?->model ?? 'gpt-5.4',
            'duration_ms' => (int) round((hrtime(true) - $startedAt) / 1_000_000),
            'prompt_tokens' => $response?->usage?->promptTokens ?? 0,
            'completion_tokens' => $response?->usage?->completionTokens ?? 0,
            'cache_read_tokens' => $response?->usage?->cacheReadInputTokens ?? 0,
            'reasoning_tokens' => $response?->usage?->reasoningTokens ?? 0,
            'tool_calls_count' => $response?->toolCalls?->count() ?? 0,
            'knowledge_version' => OpenAiCazadorKnowledgeDocument::active()?->version,
            'error_code' => $errorCode,
        ]);
    }
}
