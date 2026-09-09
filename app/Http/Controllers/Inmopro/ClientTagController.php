<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
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
            ->with(['advisor:id,name'])
            ->withCount('clients')
            ->orderBy('advisor_id')
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
        abort(403, 'Las etiquetas las gestiona cada vendedor desde el CRM.');
    }

    public function store(): RedirectResponse
    {
        abort(403, 'Las etiquetas las gestiona cada vendedor desde el CRM.');
    }

    public function show(ClientTag $client_tag): Response
    {
        $client_tag->load(['advisor:id,name'])->loadCount('clients');

        return Inertia::render('inmopro/client-tags/show', [
            'clientTag' => $client_tag,
        ]);
    }

    public function edit(ClientTag $client_tag): Response
    {
        abort(403, 'Las etiquetas las gestiona cada vendedor desde el CRM.');
    }

    public function update(ClientTag $client_tag): RedirectResponse
    {
        abort(403, 'Las etiquetas las gestiona cada vendedor desde el CRM.');
    }

    public function destroy(ClientTag $client_tag): RedirectResponse
    {
        abort(403, 'Las etiquetas las gestiona cada vendedor desde el CRM.');
    }
}
