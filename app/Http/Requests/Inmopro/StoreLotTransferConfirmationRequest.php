<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\LotExpense;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLotTransferConfirmationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('inmopro.lots.transfer-confirmation.store') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'evidence_image' => ['required', 'image', 'max:5120'],
            'expenses' => ['nullable', 'array'],
            'expenses.*.category' => ['required', Rule::in([LotExpense::CATEGORY_TRANSFER, LotExpense::CATEGORY_OTHER])],
            'expenses.*.concept' => ['required', 'string', 'max:255'],
            'expenses.*.amount' => ['required', 'numeric', 'gt:0'],
            'expenses.*.expense_date' => ['required', 'date'],
            'expenses.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'evidence_image.required' => 'Debe adjuntar la evidencia de la transferencia.',
            'evidence_image.image' => 'La evidencia debe ser una imagen valida.',
            'evidence_image.max' => 'La imagen no debe superar los 5 MB.',
        ];
    }
}
