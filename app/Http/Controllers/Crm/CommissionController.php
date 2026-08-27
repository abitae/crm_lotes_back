<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Commission;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommissionController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $commissions = Commission::query()
            ->where('advisor_id', $advisor->id)
            ->with(['lot.project', 'status'])
            ->orderByDesc('date')
            ->paginate(20);

        return Inertia::render('crm/commissions/index', [
            'commissions' => $commissions,
        ]);
    }
}
