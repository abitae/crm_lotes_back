<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreCommissionStatusRequest;
use App\Http\Requests\Inmopro\UpdateCommissionStatusRequest;
use App\Models\Inmopro\CommissionStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommissionStatusController extends Controller
{
    public function index(Request $request): Response
    {
        $commissionStatuses = CommissionStatus::orderBy('sort_order')->paginate(10)->withQueryString();

        return Inertia::render('inmopro/commission-statuses/index', [
            'commissionStatuses' => $commissionStatuses,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.commission-statuses.index', ['create' => 1]);
    }

    public function store(StoreCommissionStatusRequest $request): RedirectResponse
    {
        CommissionStatus::create($request->validated());

        return redirect()->route('inmopro.commission-statuses.index');
    }

    public function show(CommissionStatus $commission_status): Response
    {
        $commission_status->loadCount('commissions');

        return Inertia::render('inmopro/commission-statuses/show', [
            'commissionStatus' => $commission_status,
        ]);
    }

    public function edit(CommissionStatus $commission_status): Response
    {
        return Inertia::render('inmopro/commission-statuses/edit', [
            'commissionStatus' => $commission_status,
        ]);
    }

    public function update(UpdateCommissionStatusRequest $request, CommissionStatus $commission_status): RedirectResponse
    {
        $commission_status->update($request->validated());

        return redirect()->route('inmopro.commission-statuses.index');
    }

    public function destroy(CommissionStatus $commission_status): RedirectResponse
    {
        $commission_status->delete();

        return redirect()->route('inmopro.commission-statuses.index');
    }
}
