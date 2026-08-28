<?php

namespace App\Http\Controllers\Crm\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\Auth\ResetAdvisorPinRequest;
use App\Models\Inmopro\Advisor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ResetPinController extends Controller
{
    public function create(Request $request, string $token): Response
    {
        return Inertia::render('crm/auth/reset-pin', [
            'token' => $token,
            'email' => (string) $request->query('email', ''),
        ]);
    }

    public function store(ResetAdvisorPinRequest $request): RedirectResponse
    {
        $status = Password::broker('advisors')->reset(
            [
                'email' => $request->input('email'),
                'token' => $request->input('token'),
                'password' => $request->input('pin'),
            ],
            function (Advisor $advisor, string $pin): void {
                $advisor->forceFill([
                    'pin' => $pin,
                    'must_change_pin' => false,
                ])->save();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => 'El enlace de restablecimiento no es válido o ha vencido. Solicita uno nuevo.',
            ]);
        }

        return redirect()->route('crm.login')->with('status', 'PIN actualizado. Ya puedes iniciar sesión.');
    }
}
