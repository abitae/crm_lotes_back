<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreLotExpenseRequest;
use App\Http\Requests\Inmopro\UpdateLotExpenseRequest;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotExpense;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LotExpenseController extends Controller
{
    public function store(StoreLotExpenseRequest $request, Lot $lot): RedirectResponse
    {
        $lot->expenses()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Gasto registrado correctamente.');
    }

    public function update(UpdateLotExpenseRequest $request, Lot $lot, LotExpense $expense): RedirectResponse
    {
        abort_unless((int) $expense->lot_id === (int) $lot->id, 404);
        $expense->update([...$request->validated(), 'updated_by' => $request->user()->id]);

        return back()->with('success', 'Gasto actualizado correctamente.');
    }

    public function destroy(Request $request, Lot $lot, LotExpense $expense): RedirectResponse
    {
        abort_unless($request->user()?->can('inmopro.lots.expenses.destroy'), 403);
        abort_unless((int) $expense->lot_id === (int) $lot->id, 404);
        $expense->delete();

        return back()->with('success', 'Gasto eliminado correctamente.');
    }
}
