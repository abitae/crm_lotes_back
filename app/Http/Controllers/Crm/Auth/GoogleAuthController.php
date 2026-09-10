<?php

namespace App\Http\Controllers\Crm\Auth;

use App\Http\Controllers\Controller;
use App\Services\Google\GoogleAccountService;
use App\Support\CrmAuthRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->scopes(config('google.scopes.login'))
            ->redirect();
    }

    public function callback(GoogleAccountService $googleAccountService): RedirectResponse
    {
        try {
            $socialiteUser = Socialite::driver('google')->user();
            $advisor = $googleAccountService->linkAdvisorFromSocialite(
                $socialiteUser,
                $socialiteUser->token,
                $socialiteUser->refreshToken,
            );

            Auth::guard('advisor')->login($advisor);
            request()->session()->regenerate();
            $advisor->forceFill(['last_login_at' => now()])->save();

            return redirect()->to(CrmAuthRedirect::intended(request()));
        } catch (InvalidArgumentException $exception) {
            return redirect()
                ->route('crm.login')
                ->withErrors(['username' => $exception->getMessage()]);
        }
    }
}
