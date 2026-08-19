<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\LotExpense;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLotExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('inmopro.lots.expenses.store') ?? false;
    }

    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in([LotExpense::CATEGORY_TRANSFER, LotExpense::CATEGORY_OTHER])],
            'concept' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'expense_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
