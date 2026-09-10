<?php

namespace App\Support;

use Illuminate\Http\Request;

final class CrmAuthRedirect
{
    /**
     * Only honor an intended URL if it belongs to the CRM. An Inmopro
     * guest bounce (e.g. /dashboard → /login) must not send a vendedor there.
     */
    public static function intended(Request $request): string
    {
        $fallback = route('crm.dashboard');
        $intended = $request->session()->pull('url.intended', $fallback);
        $path = parse_url($intended, PHP_URL_PATH) ?? '';

        return str_starts_with($path, '/crm') ? $intended : $fallback;
    }
}
