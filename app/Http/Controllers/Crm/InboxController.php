<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaConversation;
use App\Services\Meta\MetaSendService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->first();

        if (! $connection?->isActive()) {
            return redirect()
                ->route('crm.profile.edit')
                ->withErrors(['meta' => 'Conecta Meta Business desde tu perfil para usar el inbox.']);
        }

        $conversations = MetaConversation::query()
            ->where('advisor_id', $advisor->id)
            ->with(['contactIdentity', 'client.status', 'client.tags'])
            ->when($request->filled('channel'), fn ($q) => $q->where('channel', $request->string('channel')))
            ->when($request->filled('q'), function ($q) use ($request): void {
                $term = $request->string('q')->toString();
                $q->where(function ($query) use ($term): void {
                    $query->whereHas('contactIdentity', fn ($iq) => $iq
                        ->where('profile_name', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%"))
                        ->orWhereHas('client', fn ($cq) => $cq->where('name', 'like', "%{$term}%"));
                });
            })
            ->orderByDesc('last_message_at')
            ->paginate(20)
            ->withQueryString();

        $selected = null;
        $messages = [];

        if ($request->filled('conversation')) {
            $conversation = MetaConversation::query()
                ->where('advisor_id', $advisor->id)
                ->with(['contactIdentity', 'client.status', 'client.tags', 'messages' => fn ($q) => $q->orderBy('created_at')])
                ->find($request->integer('conversation'));

            if ($conversation) {
                $selected = $conversation;
                $messages = $conversation->messages;
            }
        }

        return Inertia::render('crm/inbox/index', [
            'conversations' => $conversations,
            'selectedConversation' => $selected,
            'messages' => $messages,
            'filters' => [
                'channel' => $request->string('channel')->toString(),
                'q' => $request->string('q')->toString(),
                'conversation' => $request->integer('conversation') ?: null,
            ],
            'statuses' => ClientStatus::query()->forAdvisor($advisor->id)->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'color']),
            'tags' => ClientTag::query()->forAdvisor($advisor->id)->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'color']),
            'meta' => [
                'whatsapp' => $connection->hasWhatsApp(),
                'messenger' => $connection->hasMessenger(),
                'instagram' => $connection->hasInstagram(),
            ],
        ]);
    }

    public function send(Request $request, MetaConversation $conversation, MetaSendService $sendService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        abort_unless((int) $conversation->advisor_id === (int) $advisor->id, 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:4096'],
        ]);

        $sendService->sendText($conversation, $advisor, $validated['body']);

        return redirect()
            ->route('crm.inbox.index', ['conversation' => $conversation->id])
            ->with('success', 'Mensaje enviado.');
    }

    public function toggleBot(Request $request, MetaConversation $conversation): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        abort_unless((int) $conversation->advisor_id === (int) $advisor->id, 403);

        $conversation->update([
            'bot_enabled' => ! $conversation->bot_enabled,
            'status' => $conversation->bot_enabled ? MetaConversation::STATUS_HUMAN : MetaConversation::STATUS_BOT,
        ]);

        return back();
    }
}
