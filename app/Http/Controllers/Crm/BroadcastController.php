<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\Meta\ProcessBroadcastBatchJob;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Meta\MetaBroadcast;
use App\Models\Meta\MetaBroadcastRecipient;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaMessageTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BroadcastController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        if (! $advisor->metaConnection?->isActive()) {
            return redirect()->route('crm.profile.edit')
                ->withErrors(['meta' => 'Conecta Meta para enviar broadcasts.']);
        }

        $broadcasts = MetaBroadcast::query()
            ->where('advisor_id', $advisor->id)
            ->orderByDesc('created_at')
            ->paginate(15);

        return Inertia::render('crm/broadcasts/index', [
            'broadcasts' => $broadcasts,
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->first();

        if (! $connection?->hasWhatsApp()) {
            return redirect()->route('crm.inbox.index')
                ->withErrors(['meta' => 'Necesitas WhatsApp conectado para broadcasts.']);
        }

        $templates = MetaMessageTemplate::query()
            ->where('meta_connection_id', $connection->id)
            ->where('status', 'APPROVED')
            ->orderBy('template_name')
            ->get(['id', 'template_name', 'language', 'category']);

        return Inertia::render('crm/broadcasts/create', [
            'templates' => $templates,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'message_template_id' => ['required', 'exists:meta_message_templates,id'],
            'segment_config' => ['nullable', 'array'],
        ]);

        $clients = $this->buildSegment($advisor, $validated['segment_config'] ?? []);

        $broadcast = MetaBroadcast::query()->create([
            'advisor_id' => $advisor->id,
            'meta_connection_id' => $connection->id,
            'message_template_id' => $validated['message_template_id'],
            'name' => $validated['name'],
            'segment_config' => $validated['segment_config'] ?? [],
            'status' => 'processing',
            'total_recipients' => $clients->count(),
        ]);

        foreach ($clients as $client) {
            MetaBroadcastRecipient::query()->create([
                'broadcast_id' => $broadcast->id,
                'client_id' => $client->id,
                'phone' => $client->phone,
                'status' => 'pending',
            ]);
        }

        ProcessBroadcastBatchJob::dispatch($broadcast->id);

        return redirect()->route('crm.broadcasts.index')->with('success', 'Broadcast iniciado.');
    }

    /**
     * @param  array<string, mixed>  $segment
     */
    private function buildSegment(Advisor $advisor, array $segment)
    {
        return Client::query()
            ->where('advisor_id', $advisor->id)
            ->when(isset($segment['client_status_id']), fn ($q) => $q->where('client_status_id', $segment['client_status_id']))
            ->when(isset($segment['tag_id']), fn ($q) => $q->whereHas('tags', fn ($tq) => $tq->where('client_tags.id', $segment['tag_id'])))
            ->whereNotNull('phone')
            ->get(['id', 'phone']);
    }
}
