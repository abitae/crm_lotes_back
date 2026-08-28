<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\UpdateAdvisorPinRequest;
use App\Http\Requests\Crm\UpdateAdvisorProfileRequest;
use App\Models\Inmopro\Advisor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $advisor->loadMissing(['team', 'level']);

        return Inertia::render('crm/profile/edit', [
            'advisor' => $advisor,
        ]);
    }

    public function update(UpdateAdvisorProfileRequest $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        $advisor->update($request->validated());

        return redirect()->route('crm.profile.edit')->with('success', 'Perfil actualizado.');
    }

    public function updatePin(UpdateAdvisorPinRequest $request): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        if (! Hash::check((string) $request->input('current_pin'), (string) $advisor->pin)) {
            throw ValidationException::withMessages(['current_pin' => 'El PIN actual no es válido.']);
        }

        $advisor->update(['pin' => $request->input('pin'), 'must_change_pin' => false]);

        return redirect()->route('crm.profile.edit')->with('success', 'PIN actualizado correctamente.');
    }
}
