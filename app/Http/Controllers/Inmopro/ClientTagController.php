<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreClientTagRequest;
use App\Http\Requests\Inmopro\UpdateClientTagRequest;
use App\Models\Inmopro\ClientTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientTagController extends Controller
{
    public function index(Request $request): Response
    {
        $clientTags = ClientTag::query()
            ->withCount('clients')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('inmopro/client-tags/index', [
            'clientTags' => $clientTags,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('inmopro/client-tags/create');
    }

    public function store(StoreClientTagRequest $request): RedirectResponse
    {
        ClientTag::create($request->validated());

        return redirect()->route('inmopro.client-tags.index');
    }

    public function show(ClientTag $client_tag): Response
    {
        $client_tag->loadCount('clients');

        return Inertia::render('inmopro/client-tags/show', [
            'clientTag' => $client_tag,
        ]);
    }

    public function edit(ClientTag $client_tag): Response
    {
        return Inertia::render('inmopro/client-tags/edit', [
            'clientTag' => $client_tag,
        ]);
    }

    public function update(UpdateClientTagRequest $request, ClientTag $client_tag): RedirectResponse
    {
        $client_tag->update($request->validated());

        return redirect()->route('inmopro.client-tags.index');
    }

    public function destroy(ClientTag $client_tag): RedirectResponse
    {
        $client_tag->delete();

        return redirect()->route('inmopro.client-tags.index');
    }
}
