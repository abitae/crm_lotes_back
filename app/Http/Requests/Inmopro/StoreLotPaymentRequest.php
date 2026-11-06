<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotPayment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLotPaymentRequest extends FormRequest
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
        /** @var Lot|null $lot */
        $lot = $this->route('lot');

        return [
            'lot_installment_id' => [
                'nullable',
                'integer',
                Rule::exists('lot_installments', 'id')->where('lot_id', $lot?->id),
            ],
            'cash_account_id' => [
                'nullable',
                'integer',
                Rule::exists('cash_accounts', 'id')->where('is_active', true),
            ],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'payment_method' => ['required', 'string', Rule::in(LotPayment::PAYMENT_METHODS)],
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
            'lot_installment_id.exists' => 'La cuota seleccionada no pertenece a este lote.',
            'cash_account_id.exists' => 'La cuenta seleccionada no existe o está inactiva.',
            'payment_method.in' => 'El método de pago debe ser transferencia, efectivo o POS.',
            'voucher_image.required' => 'Debe adjuntar el comprobante del abono.',
            'voucher_image.image' => 'El comprobante debe ser una imagen válida.',
            'voucher_image.max' => 'La imagen no debe superar los 5 MB.',
        ];
    }
}
