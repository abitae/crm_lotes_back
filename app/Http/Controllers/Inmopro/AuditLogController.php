<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\InmoproAuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = InmoproAuditLog::query()->with('user:id,name,email')->latest('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.$request->string('action')->toString().'%');
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->string('from')->toString().' 00:00:00');
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->string('to')->toString().' 23:59:59');
        }

        return Inertia::render('inmopro/audit/index', [
            'logs' => $query->paginate(30)->withQueryString(),
            'filters' => [
                'user_id' => $request->input('user_id'),
                'action' => $request->input('action'),
                'from' => $request->input('from'),
                'to' => $request->input('to'),
            ],
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
            'actions' => InmoproAuditLog::query()
                ->select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action'),
        ]);
    }
}
