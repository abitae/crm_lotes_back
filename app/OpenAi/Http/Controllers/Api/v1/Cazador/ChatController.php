<?php

namespace App\OpenAi\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\OpenAi\Agents\CazadorCatalogAssistant;
use App\OpenAi\Http\Requests\Api\v1\Cazador\ChatRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function store(ChatRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $message = (string) $validated['message'];
        $conversationId = isset($validated['conversation_id'])
            ? (string) $validated['conversation_id']
            : (string) Str::uuid();

        $model = config('openai_cazador.model');

        $response = CazadorCatalogAssistant::make()->prompt(
            $message,
            model: is_string($model) && $model !== '' ? $model : null,
        );

        return response()->json([
            'reply' => (string) $response,
            'conversation_id' => $conversationId,
        ]);
    }
}
