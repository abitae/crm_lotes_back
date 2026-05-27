<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreAttentionTicketTypeRequest;
use App\Http\Requests\Inmopro\UpdateAttentionTicketTypeRequest;
use App\Models\Inmopro\AttentionTicketType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttentionTicketTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $types = AttentionTicketType::query()
            ->withCount('tickets')
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where(function ($q) use ($request): void {
                    $term = trim((string) $request->input('search'));
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%");
                })
            )
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('inmopro/attention-ticket-types/index', [
            'types' => $types,
            'filters' => $request->only('search'),
            'abilities' => [
                'create' => $request->user()?->can('inmopro.attention-ticket-types.store') ?? false,
                'update' => $request->user()?->can('inmopro.attention-ticket-types.update') ?? false,
                'delete' => $request->user()?->can('inmopro.attention-ticket-types.destroy') ?? false,
            ],
        ]);
    }

    public function store(StoreAttentionTicketTypeRequest $request): RedirectResponse
    {
        AttentionTicketType::create($request->validated());

        return redirect()->route('inmopro.attention-ticket-types.index');
    }

    public function update(UpdateAttentionTicketTypeRequest $request, AttentionTicketType $attention_ticket_type): RedirectResponse
    {
        $attention_ticket_type->update($request->validated());

        return redirect()->route('inmopro.attention-ticket-types.index');
    }

    public function destroy(AttentionTicketType $attention_ticket_type): RedirectResponse
    {
        if ($attention_ticket_type->tickets()->exists()) {
            return back()->withErrors([
                'attention_ticket_type' => 'No se puede eliminar un tipo con tickets asociados.',
            ]);
        }

        $attention_ticket_type->delete();

        return redirect()->route('inmopro.attention-ticket-types.index');
    }
}
