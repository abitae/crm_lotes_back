<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\GoogleAccount;
use App\Models\Inmopro\Advisor;
use App\Services\Google\GoogleAccountService;
use App\Services\Google\GoogleCalendarSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Laravel\Socialite\Facades\Socialite;

class GoogleCalendarController extends Controller
{
    public function connect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->scopes(array_merge(config('google.scopes.login'), config('google.scopes.calendar')))
            ->with([
                'access_type' => 'offline',
                'prompt' => 'consent',
            ])
            ->redirectUrl((string) config('google.calendar_redirect_uri'))
            ->redirect();
    }

    public function callback(Request $request, GoogleAccountService $googleAccountService, GoogleCalendarSyncService $syncService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        try {
            $socialiteUser = Socialite::driver('google')
                ->redirectUrl((string) config('google.calendar_redirect_uri'))
                ->user();

            $account = $googleAccountService->connectCalendar(
                $advisor,
                $socialiteUser,
                $socialiteUser->token,
                $socialiteUser->refreshToken,
            );

            $syncService->syncAdvisor($account);

            return redirect()
                ->route('crm.profile.edit')
                ->with('success', 'Google Calendar conectado correctamente.');
        } catch (InvalidArgumentException $exception) {
            return redirect()
                ->route('crm.profile.edit')
                ->withErrors(['google_calendar' => $exception->getMessage()]);
        }
    }

    public function disconnect(Request $request, GoogleAccountService $googleAccountService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $googleAccountService->disconnectCalendar($advisor);

        return redirect()
            ->route('crm.profile.edit')
            ->with('success', 'Google Calendar desconectado.');
    }

    public function syncNow(Request $request, GoogleCalendarSyncService $syncService): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $account = GoogleAccount::query()->where('advisor_id', $advisor->id)->first();

        if ($account?->hasCalendarScope()) {
            $syncService->syncAdvisor($account);
        }

        return redirect()
            ->route('crm.agenda.index')
            ->with('success', 'Agenda sincronizada con Google Calendar.');
    }
}
