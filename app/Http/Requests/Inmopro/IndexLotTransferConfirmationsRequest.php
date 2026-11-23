<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class IndexLotTransferConfirmationsRequest extends FormRequest
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
            'date_field' => ['nullable', 'in:contract_date,payment_limit_date,notarial_transfer_date'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date_from.date' => 'La fecha inicial no es válida.',
            'date_to.date' => 'La fecha final no es válida.',
            'date_to.after_or_equal' => 'La fecha final debe ser igual o posterior a la inicial.',
            'date_field.in' => 'Elige una fecha válida para filtrar.',
        ];
    }
}
