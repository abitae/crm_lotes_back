<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Meta\MetaAutomationFlow;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MetaAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $connections = MetaConnection::query()
            ->with(['advisor:id,name,email'])
            ->orderByDesc('connected_at')
            ->paginate(20);

        $stats = [
            'active_connections' => MetaConnection::query()->where('status', MetaConnection::STATUS_ACTIVE)->count(),
            'total_conversations' => MetaConversation::query()->count(),
            'messages_today' => MetaMessage::query()->whereDate('created_at', today())->count(),
        ];

        $templates = MetaAutomationFlow::query()
            ->where('is_corporate_template', true)
            ->orderBy('name')
            ->get(['id', 'name', 'trigger_type', 'is_published']);

        return Inertia::render('inmopro/meta/index', [
            'connections' => $connections,
            'stats' => $stats,
            'templates' => $templates,
        ]);
    }
}
