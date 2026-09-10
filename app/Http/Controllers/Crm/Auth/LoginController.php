<?php

namespace App\Http\Controllers\Crm\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\Auth\LoginAdvisorRequest;
use App\Models\Inmopro\Advisor;
use App\Support\CrmAuthRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('crm/auth/login', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(LoginAdvisorRequest $request): RedirectResponse
    {
        $advisor = Advisor::query()
            ->where('username', $request->string('username')->toString())
            ->first();

        if (! $advisor || ! $advisor->is_active || ! $advisor->pin || ! Hash::check((string) $request->input('pin'), $advisor->pin)) {
            return back()->withErrors([
                'username' => 'Credenciales inválidas.',
            ])->onlyInput('username');
        }

        Auth::guard('advisor')->login($advisor);
        $request->session()->regenerate();
        $advisor->forceFill(['last_login_at' => now()])->save();

        return redirect()->to(CrmAuthRedirect::intended($request));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('advisor')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('crm.login');
    }
}
