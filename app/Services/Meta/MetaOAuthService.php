<?php

namespace App\Services\Meta;

use App\Models\Inmopro\Advisor;
use App\Models\Meta\MetaConnection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class MetaOAuthService
{
    public function buildAuthorizationUrl(Advisor $advisor): string
    {
        $params = http_build_query([
            'client_id' => config('meta.app_id'),
            'redirect_uri' => config('meta.redirect_uri'),
            'state' => $this->buildState($advisor),
            'scope' => implode(',', config('meta.oauth_scopes')),
            'response_type' => 'code',
        ]);

        $version = config('meta.graph_version');

        return "https://www.facebook.com/{$version}/dialog/oauth?{$params}";
    }

    public function buildState(Advisor $advisor): string
    {
        return encrypt([
            'advisor_id' => $advisor->id,
            'ts' => now()->timestamp,
        ]);
    }

    /**
     * @return array{advisor_id: int}
     */
    public function parseState(string $state): array
    {
        $data = decrypt($state);

        if (! is_array($data) || ! isset($data['advisor_id'])) {
            throw new InvalidArgumentException('Estado OAuth inválido.');
        }

        if (($data['ts'] ?? 0) < now()->subHour()->timestamp) {
            throw new InvalidArgumentException('La sesión de conexión Meta expiró. Intenta de nuevo.');
        }

        return ['advisor_id' => (int) $data['advisor_id']];
    }

    /**
     * @return array{access_token: string, expires_in?: int}
     */
    public function exchangeCodeForToken(string $code): array
    {
        $version = config('meta.graph_version');
        $response = Http::get("https://graph.facebook.com/{$version}/oauth/access_token", [
            'client_id' => config('meta.app_id'),
            'client_secret' => config('meta.app_secret'),
            'redirect_uri' => config('meta.redirect_uri'),
            'code' => $code,
        ]);

        if (! $response->successful()) {
            Log::error('Meta OAuth token exchange failed', ['body' => $response->json()]);

            throw new InvalidArgumentException('No se pudo conectar con Meta. Intenta de nuevo.');
        }

        /** @var array{access_token?: string, expires_in?: int} $data */
        $data = $response->json();

        if (blank($data['access_token'] ?? null)) {
            throw new InvalidArgumentException('Meta no devolvió un token de acceso.');
        }

        return $data;
    }

    public function connectAdvisor(Advisor $advisor, string $accessToken, ?int $expiresIn = null): MetaConnection
    {
        $assets = $this->discoverAssets($accessToken);

        return MetaConnection::query()->updateOrCreate(
            ['advisor_id' => $advisor->id],
            [
                'status' => MetaConnection::STATUS_ACTIVE,
                'access_token' => $accessToken,
                'token_expires_at' => $expiresIn ? now()->addSeconds($expiresIn) : null,
                'waba_id' => $assets['waba_id'],
                'phone_number_id' => $assets['phone_number_id'],
                'page_id' => $assets['page_id'],
                'ig_user_id' => $assets['ig_user_id'],
                'meta' => $assets['meta'],
                'connected_at' => now(),
                'last_synced_at' => now(),
            ],
        );
    }

    public function disconnect(Advisor $advisor, ?string $channel = null): void
    {
        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->first();

        if (! $connection) {
            return;
        }

        if ($channel === 'whatsapp') {
            $connection->update(['waba_id' => null, 'phone_number_id' => null]);
        } elseif ($channel === 'messenger') {
            $connection->update(['page_id' => null]);
        } elseif ($channel === 'instagram') {
            $connection->update(['ig_user_id' => null]);
        } else {
            $connection->update([
                'status' => MetaConnection::STATUS_DISCONNECTED,
                'access_token' => null,
                'waba_id' => null,
                'phone_number_id' => null,
                'page_id' => null,
                'ig_user_id' => null,
            ]);
        }

        if (! $connection->hasWhatsApp() && ! $connection->hasMessenger() && ! $connection->hasInstagram()) {
            $connection->update(['status' => MetaConnection::STATUS_DISCONNECTED]);
        }
    }

    /**
     * @return array{
     *     waba_id: ?string,
     *     phone_number_id: ?string,
     *     page_id: ?string,
     *     ig_user_id: ?string,
     *     meta: array<string, mixed>
     * }
     */
    public function discoverAssets(string $accessToken): array
    {
        $version = config('meta.graph_version');
        $meta = [];

        $pagesResponse = Http::get("https://graph.facebook.com/{$version}/me/accounts", [
            'access_token' => $accessToken,
            'fields' => 'id,name,access_token,instagram_business_account',
        ]);

        $pageId = null;
        $igUserId = null;
        $pageToken = $accessToken;

        if ($pagesResponse->successful()) {
            /** @var list<array<string, mixed>> $pages */
            $pages = $pagesResponse->json('data') ?? [];
            $page = $pages[0] ?? null;

            if (is_array($page)) {
                $pageId = isset($page['id']) ? (string) $page['id'] : null;
                $pageToken = isset($page['access_token']) ? (string) $page['access_token'] : $accessToken;
                $meta['page_name'] = $page['name'] ?? null;

                $igAccount = $page['instagram_business_account'] ?? null;
                if (is_array($igAccount) && isset($igAccount['id'])) {
                    $igUserId = (string) $igAccount['id'];
                } elseif (is_string($igAccount)) {
                    $igUserId = $igAccount;
                }
            }
        }

        $wabaId = null;
        $phoneNumberId = null;

        $wabaResponse = Http::get("https://graph.facebook.com/{$version}/me/businesses", [
            'access_token' => $accessToken,
        ]);

        if ($wabaResponse->successful()) {
            /** @var list<array<string, mixed>> $businesses */
            $businesses = $wabaResponse->json('data') ?? [];

            foreach ($businesses as $business) {
                $businessId = $business['id'] ?? null;
                if (! is_string($businessId)) {
                    continue;
                }

                $ownedWaba = Http::get("https://graph.facebook.com/{$version}/{$businessId}/owned_whatsapp_business_accounts", [
                    'access_token' => $accessToken,
                ]);

                if (! $ownedWaba->successful()) {
                    continue;
                }

                /** @var list<array<string, mixed>> $wabas */
                $wabas = $ownedWaba->json('data') ?? [];
                $waba = $wabas[0] ?? null;

                if (! is_array($waba)) {
                    continue;
                }

                $wabaId = isset($waba['id']) ? (string) $waba['id'] : null;

                if ($wabaId) {
                    $phones = Http::get("https://graph.facebook.com/{$version}/{$wabaId}/phone_numbers", [
                        'access_token' => $accessToken,
                    ]);

                    if ($phones->successful()) {
                        /** @var list<array<string, mixed>> $numbers */
                        $numbers = $phones->json('data') ?? [];
                        $number = $numbers[0] ?? null;

                        if (is_array($number)) {
                            $phoneNumberId = isset($number['id']) ? (string) $number['id'] : null;
                            $meta['display_phone'] = $number['display_phone_number'] ?? null;
                        }
                    }
                }

                break;
            }
        }

        if ($pageId && $pageToken !== $accessToken) {
            $meta['page_access_token'] = $pageToken;
        }

        return [
            'waba_id' => $wabaId,
            'phone_number_id' => $phoneNumberId,
            'page_id' => $pageId,
            'ig_user_id' => $igUserId,
            'meta' => $meta,
        ];
    }

    /**
     * @return array{connected: bool, whatsapp: bool, messenger: bool, instagram: bool, display_phone?: string, page_name?: string}
     */
    public function statusForAdvisor(Advisor $advisor): array
    {
        $connection = MetaConnection::query()->where('advisor_id', $advisor->id)->first();

        if (! $connection?->isActive()) {
            return [
                'connected' => false,
                'whatsapp' => false,
                'messenger' => false,
                'instagram' => false,
            ];
        }

        return [
            'connected' => true,
            'whatsapp' => $connection->hasWhatsApp(),
            'messenger' => $connection->hasMessenger(),
            'instagram' => $connection->hasInstagram(),
            'display_phone' => $connection->meta['display_phone'] ?? null,
            'page_name' => $connection->meta['page_name'] ?? null,
            'status' => $connection->status,
        ];
    }
}
