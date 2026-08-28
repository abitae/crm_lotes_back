<?php

namespace App\Http\Controllers\Crm\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\Auth\SendPinResetLinkRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class ForgotPinController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('crm/auth/forgot-pin', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(SendPinResetLinkRequest $request): RedirectResponse
    {
        Password::broker('advisors')->sendResetLink(
            $request->only('email'),
        );

        // Always respond the same way whether or not the email matched an advisor,
        // so this endpoint cannot be used to enumerate valid accounts.
        return back()->with('status', 'Si el correo pertenece a una cuenta activa, enviamos un enlace para restablecer el PIN.');
    }
}
