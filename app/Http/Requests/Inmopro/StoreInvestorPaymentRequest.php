<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\InvestorContract;
use App\Models\Inmopro\InvestorPayment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvestorPaymentRequest extends FormRequest
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
        $contract = $this->route('investor_contract');
        $contractId = $contract instanceof InvestorContract ? $contract->id : 0;

        return [
            'investor_installment_id' => [
                'nullable',
                'integer',
                Rule::exists('investor_installments', 'id')->where('investor_contract_id', $contractId),
            ],
            'cash_account_id' => ['required', 'integer', Rule::exists('cash_accounts', 'id')->where('is_active', true)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'payment_method' => ['required', 'string', Rule::in(InvestorPayment::PAYMENT_METHODS)],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:255'],
            'voucher_image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'investor_installment_id.exists' => 'La cuota no pertenece a este contrato.',
            'cash_account_id.required' => 'Seleccione la caja de donde sale el pago.',
            'cash_account_id.exists' => 'La caja seleccionada no existe o está inactiva.',
            'amount.required' => 'Indique el monto del pago.',
            'amount.min' => 'El monto debe ser mayor a cero.',
            'paid_at.required' => 'Indique la fecha del pago.',
            'payment_method.in' => 'El método de pago no es válido.',
            'voucher_image.required' => 'Adjunte el comprobante del pago.',
            'voucher_image.mimes' => 'El comprobante debe ser una imagen o PDF.',
        ];
    }
}
