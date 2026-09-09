<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
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
            ->with(['advisor:id,name'])
            ->withCount('clients')
            ->orderBy('advisor_id')
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
        abort(403, 'Los estados los gestiona cada vendedor desde el CRM.');
    }

    public function store(): RedirectResponse
    {
        abort(403, 'Los estados los gestiona cada vendedor desde el CRM.');
    }

    public function show(ClientStatus $client_status): Response
    {
        $client_status->load(['advisor:id,name'])->loadCount('clients');

        return Inertia::render('inmopro/client-statuses/show', [
            'clientStatus' => $client_status,
        ]);
    }

    public function edit(ClientStatus $client_status): Response
    {
        abort(403, 'Los estados los gestiona cada vendedor desde el CRM.');
    }

    public function update(ClientStatus $client_status): RedirectResponse
    {
        abort(403, 'Los estados los gestiona cada vendedor desde el CRM.');
    }

    public function destroy(ClientStatus $client_status): RedirectResponse
    {
        abort(403, 'Los estados los gestiona cada vendedor desde el CRM.');
    }
}
