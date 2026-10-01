<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreClientTypeRequest;
use App\Http\Requests\Inmopro\UpdateClientTypeRequest;
use App\Models\Inmopro\ClientType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $clientTypes = ClientType::query()
            ->withCount('clients')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('inmopro/client-types/index', [
            'clientTypes' => $clientTypes,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.client-types.index', ['create' => 1]);
    }

    public function store(StoreClientTypeRequest $request): RedirectResponse
    {
        ClientType::create($request->validated());

        return redirect()->route('inmopro.client-types.index');
    }

    public function show(ClientType $client_type): Response
    {
        $client_type->loadCount('clients');

        return Inertia::render('inmopro/client-types/show', [
            'clientType' => $client_type,
        ]);
    }

    public function edit(ClientType $client_type): Response
    {
        return Inertia::render('inmopro/client-types/edit', [
            'clientType' => $client_type,
        ]);
    }

    public function update(UpdateClientTypeRequest $request, ClientType $client_type): RedirectResponse
    {
        $client_type->update($request->validated());

        return redirect()->route('inmopro.client-types.index');
    }

    public function destroy(ClientType $client_type): RedirectResponse
    {
        $client_type->delete();

        return redirect()->route('inmopro.client-types.index');
    }
}
