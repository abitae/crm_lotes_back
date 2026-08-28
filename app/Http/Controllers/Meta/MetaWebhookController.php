<?php

namespace App\Http\Controllers\Meta;

use App\Http\Controllers\Controller;
use App\Jobs\Meta\ProcessMetaWebhookJob;
use App\Services\Meta\MetaWebhookVerifier;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class MetaWebhookController extends Controller
{
    public function verify(Request $request, MetaWebhookVerifier $verifier): Response|SymfonyResponse
    {
        $challenge = $verifier->verifySubscription(
            (string) $request->query('hub_mode', ''),
            (string) $request->query('hub_verify_token', ''),
            (string) $request->query('hub_challenge', ''),
        );

        if ($challenge === null) {
            abort(403);
        }

        return response($challenge, 200)->header('Content-Type', 'text/plain');
    }

    public function receive(Request $request, MetaWebhookVerifier $verifier): Response
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Hub-Signature-256');

        if (! $verifier->verifySignature($payload, is_string($signature) ? $signature : null)) {
            abort(403);
        }

        /** @var array<string, mixed> $data */
        $data = $request->json()->all();

        ProcessMetaWebhookJob::dispatch($data)->onQueue((string) config('meta.webhook_queue'));

        return response('EVENT_RECEIVED', 200);
    }
}
