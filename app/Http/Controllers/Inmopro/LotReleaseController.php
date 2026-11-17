<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ReleaseLotRequest;
use App\Models\Inmopro\Lot;
use App\Services\Inmopro\LotReleaseService;
use Illuminate\Http\RedirectResponse;

class LotReleaseController extends Controller
{
    public function __construct(
        private LotReleaseService $releaseService,
    ) {}

    public function __invoke(ReleaseLotRequest $request, Lot $lot): RedirectResponse
    {
        $this->releaseService->release(
            $lot,
            $request->string('reason')->toString(),
            $request->filled('notes') ? $request->string('notes')->toString() : null,
        );

        return back()->with('success', 'Lote liberado correctamente.');
    }
}
