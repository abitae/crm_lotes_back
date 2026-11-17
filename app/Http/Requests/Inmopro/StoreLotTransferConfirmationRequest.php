<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\LotExpense;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\LotTransferVoucher;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreLotTransferConfirmationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('inmopro.lots.transfer-confirmation.store') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'payer_name' => is_string($this->input('payer_name')) ? trim($this->input('payer_name')) : $this->input('payer_name'),
            'payer_dni' => is_string($this->input('payer_dni')) && trim($this->input('payer_dni')) !== ''
                ? trim($this->input('payer_dni'))
                : null,
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'transfer_date' => ['required', 'date'],
            'transfer_amount' => ['required', 'numeric', 'gt:0'],
            'payer_name' => ['required', 'string', 'max:255'],
            'payer_dni' => ['nullable', 'string', 'regex:/^[0-9A-Za-z]{8,12}$/'],
            'vouchers' => ['required', 'array', 'min:1', 'max:10'],
            'vouchers.*.image' => ['required', 'image', 'max:5120'],
            'vouchers.*.bank' => ['required', Rule::in(array_keys(LotTransferVoucher::BANKS))],
            'vouchers.*.bank_other' => ['nullable', 'required_if:vouchers.*.bank,'.LotTransferVoucher::BANK_OTHER, 'string', 'max:255'],
            'vouchers.*.amount' => ['required', 'numeric', 'gt:0'],
            'vouchers.*.operation_number' => ['required', 'string', 'max:60'],
            'expenses' => ['nullable', 'array'],
            'expenses.*.category' => ['required', Rule::in([LotExpense::CATEGORY_TRANSFER, LotExpense::CATEGORY_OTHER])],
            'expenses.*.concept' => ['required', 'string', 'max:255'],
            'expenses.*.amount' => ['required', 'numeric', 'gt:0'],
            'expenses.*.expense_date' => ['required', 'date'],
            'expenses.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $seen = [];

                foreach ($this->input('vouchers', []) as $index => $voucher) {
                    $bank = (string) ($voucher['bank'] ?? '');
                    $operation = trim((string) ($voucher['operation_number'] ?? ''));
                    $key = mb_strtoupper($bank.'|'.$operation);

                    if (isset($seen[$key])) {
                        $validator->errors()->add(
                            "vouchers.{$index}.operation_number",
                            'Este número de operación ya fue ingresado en otro comprobante.',
                        );

                        continue;
                    }

                    $seen[$key] = true;

                    $usedElsewhere = LotTransferVoucher::query()
                        ->where('bank', $bank)
                        ->where('operation_number', $operation)
                        ->whereHas('confirmation', fn ($query) => $query->where('status', '!=', LotTransferConfirmation::STATUS_REJECTED))
                        ->exists();

                    if ($usedElsewhere) {
                        $validator->errors()->add(
                            "vouchers.{$index}.operation_number",
                            'Este número de operación ya está registrado en otra transferencia.',
                        );
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'transfer_date.required' => 'Debe indicar la fecha de transferencia.',
            'transfer_date.date' => 'La fecha de transferencia no es válida.',
            'transfer_amount.required' => 'Debe indicar el monto de transferencia.',
            'transfer_amount.gt' => 'El monto de transferencia debe ser mayor que cero.',
            'payer_name.required' => 'Debe confirmar el nombre de la persona que transfiere.',
            'payer_dni.regex' => 'El documento de quien transfiere debe tener entre 8 y 12 caracteres alfanuméricos.',
            'vouchers.required' => 'Debe adjuntar al menos un comprobante.',
            'vouchers.min' => 'Debe adjuntar al menos un comprobante.',
            'vouchers.max' => 'Puede adjuntar como máximo 10 comprobantes.',
            'vouchers.*.image.required' => 'Debe adjuntar la imagen del comprobante.',
            'vouchers.*.image.image' => 'El comprobante debe ser una imagen válida.',
            'vouchers.*.image.max' => 'La imagen no debe superar los 5 MB.',
            'vouchers.*.bank.required' => 'Seleccione el banco del comprobante.',
            'vouchers.*.bank.in' => 'El banco seleccionado no es válido.',
            'vouchers.*.bank_other.required_if' => 'Indique el nombre del banco.',
            'vouchers.*.amount.required' => 'Indique el monto del comprobante.',
            'vouchers.*.amount.gt' => 'El monto del comprobante debe ser mayor que cero.',
            'vouchers.*.operation_number.required' => 'Indique el número de operación.',
        ];
    }
}
