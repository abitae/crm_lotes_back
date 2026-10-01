<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreLotStatusRequest;
use App\Http\Requests\Inmopro\UpdateLotStatusRequest;
use App\Models\Inmopro\LotStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LotStatusController extends Controller
{
    public function index(Request $request): Response
    {
        $lotStatuses = LotStatus::orderBy('sort_order')->paginate(10)->withQueryString();

        return Inertia::render('inmopro/lot-statuses/index', [
            'lotStatuses' => $lotStatuses,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.lot-statuses.index', ['create' => 1]);
    }

    public function store(StoreLotStatusRequest $request): RedirectResponse
    {
        LotStatus::create($request->validated());

        return redirect()->route('inmopro.lot-statuses.index');
    }

    public function show(LotStatus $lot_status): Response
    {
        $lot_status->loadCount('lots');

        return Inertia::render('inmopro/lot-statuses/show', [
            'lotStatus' => $lot_status,
        ]);
    }

    public function edit(LotStatus $lot_status): Response
    {
        return Inertia::render('inmopro/lot-statuses/edit', [
            'lotStatus' => $lot_status,
        ]);
    }

    public function update(UpdateLotStatusRequest $request, LotStatus $lot_status): RedirectResponse
    {
        $lot_status->update($request->validated());

        return redirect()->route('inmopro.lot-statuses.index');
    }

    public function destroy(LotStatus $lot_status): RedirectResponse
    {
        $lot_status->delete();

        return redirect()->route('inmopro.lot-statuses.index');
    }
}
