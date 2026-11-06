<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCashEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:INGRESO,EGRESO'],
            'concept' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'entry_date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
