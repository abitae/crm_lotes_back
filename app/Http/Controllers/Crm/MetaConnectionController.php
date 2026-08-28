<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\Meta\SyncWhatsAppTemplatesJob;
use App\Models\Inmopro\Advisor;
use App\Models\Meta\MetaConnection;
use App\Services\Meta\MetaOAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class MetaConnectionController extends Controller
{
    public function connect(MetaOAuthService $oauthService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = auth('advisor')->user();

        return redirect()->away($oauthService->buildAuthorizationUrl($advisor));
    }

    public function callback(Request $request, MetaOAuthService $oauthService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        if ($request->filled('error')) {
            return redirect()
                ->route('crm.profile.edit')
                ->withErrors(['meta' => 'Conexión Meta cancelada o denegada.']);
        }

        try {
            $state = (string) $request->query('state', '');
            $parsed = $oauthService->parseState($state);

            if ((int) $parsed['advisor_id'] !== (int) $advisor->id) {
                throw new InvalidArgumentException('La sesión OAuth no coincide con tu usuario.');
            }

            $tokenData = $oauthService->exchangeCodeForToken((string) $request->query('code', ''));
            $connection = $oauthService->connectAdvisor(
                $advisor,
                (string) $tokenData['access_token'],
                isset($tokenData['expires_in']) ? (int) $tokenData['expires_in'] : null,
            );

            if ($connection->hasWhatsApp()) {
                SyncWhatsAppTemplatesJob::dispatch($connection->id);
            }

            return redirect()
                ->route('crm.profile.edit')
                ->with('success', 'Meta Business conectado correctamente.');
        } catch (InvalidArgumentException $exception) {
            return redirect()
                ->route('crm.profile.edit')
                ->withErrors(['meta' => $exception->getMessage()]);
        }
    }

    public function disconnect(Request $request, MetaOAuthService $oauthService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $channel = $request->string('channel')->toString() ?: null;

        $oauthService->disconnect($advisor, $channel);

        return redirect()
            ->route('crm.profile.edit')
            ->with('success', 'Canal Meta desconectado.');
    }

    public function syncTemplates(Request $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->first();

        if ($connection?->hasWhatsApp()) {
            SyncWhatsAppTemplatesJob::dispatch($connection->id);
        }

        return redirect()
            ->route('crm.profile.edit')
            ->with('success', 'Sincronización de plantillas iniciada.');
    }
}
