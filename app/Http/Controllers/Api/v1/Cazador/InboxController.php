<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaConversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InboxController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->first();

        if (! $connection?->isActive()) {
            return response()->json([
                'connected' => false,
                'conversations' => [],
            ]);
        }

        $conversations = MetaConversation::query()
            ->where('advisor_id', $advisor->id)
            ->with(['contactIdentity:id,profile_name,phone,channel', 'client:id,name,phone'])
            ->orderByDesc('last_message_at')
            ->limit(50)
            ->get(['id', 'channel', 'status', 'client_id', 'contact_identity_id', 'last_message_at', 'bot_enabled']);

        return response()->json([
            'connected' => true,
            'conversations' => $conversations,
        ]);
    }
}
