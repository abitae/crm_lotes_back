<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class StoreLotPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'lot_installment_id' => ['nullable', 'exists:lot_installments,id'],
            'cash_account_id' => ['nullable', 'exists:cash_accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'payment_method' => ['required', 'string', 'max:30'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:255'],
            'voucher_image' => ['required', 'image', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'voucher_image.required' => 'Debe adjuntar el comprobante del abono.',
            'voucher_image.image' => 'El comprobante debe ser una imagen válida.',
            'voucher_image.max' => 'La imagen no debe superar los 5 MB.',
        ];
    }
}
