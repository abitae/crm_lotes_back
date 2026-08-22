<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreClientStatusRequest;
use App\Http\Requests\Inmopro\UpdateClientStatusRequest;
use App\Models\Inmopro\ClientStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientStatusController extends Controller
{
    public function index(Request $request): Response
    {
        $clientStatuses = ClientStatus::query()
            ->withCount('clients')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('inmopro/client-statuses/index', [
            'clientStatuses' => $clientStatuses,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('inmopro/client-statuses/create');
    }

    public function store(StoreClientStatusRequest $request): RedirectResponse
    {
        ClientStatus::create($request->validated());

        return redirect()->route('inmopro.client-statuses.index');
    }

    public function show(ClientStatus $client_status): Response
    {
        $client_status->loadCount('clients');

        return Inertia::render('inmopro/client-statuses/show', [
            'clientStatus' => $client_status,
        ]);
    }

    public function edit(ClientStatus $client_status): Response
    {
        return Inertia::render('inmopro/client-statuses/edit', [
            'clientStatus' => $client_status,
        ]);
    }

    public function update(UpdateClientStatusRequest $request, ClientStatus $client_status): RedirectResponse
    {
        $client_status->update($request->validated());

        return redirect()->route('inmopro.client-statuses.index');
    }

    public function destroy(ClientStatus $client_status): RedirectResponse
    {
        $client_status->delete();

        return redirect()->route('inmopro.client-statuses.index');
    }
}
