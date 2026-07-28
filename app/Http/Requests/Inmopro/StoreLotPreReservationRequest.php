<?php

namespace App\Http\Requests\Inmopro;

use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreLotPreReservationRequest extends FormRequest
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
            'lot_ids' => ['required', 'array', 'min:1'],
            'lot_ids.*' => ['required', 'integer', 'distinct', 'exists:lots,id'],
            'advisor_id' => ['required', 'exists:advisors,id'],
            'client_id' => ['nullable', 'required_without:new_client.name', 'exists:clients,id'],
            'new_client' => ['nullable', 'array'],
            'new_client.name' => ['nullable', 'required_without:client_id', 'string', 'max:255'],
            'new_client.dni' => ['nullable', 'required_without:client_id', 'string', 'max:20'],
            'new_client.phone' => ['nullable', 'required_without:client_id', 'string', 'max:50'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'voucher_image' => ['required', 'image', 'max:5120'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || $this->filled('client_id')) {
                return;
            }

            app(ClientDuplicateRegistrationChecker::class)->addValidationErrors(
                $validator,
                $this->input('new_client.dni'),
                $this->input('new_client.phone'),
                null,
                'new_client.',
            );
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'voucher_image.required' => 'Debe adjuntar el voucher de la pre-reserva.',
            'amount.required' => 'Debe ingresar el monto de la pre-reserva.',
            'lot_ids.required' => 'Debe seleccionar al menos un lote libre.',
            'lot_ids.min' => 'Debe seleccionar al menos un lote libre.',
            'client_id.required_without' => 'Debe seleccionar un cliente o registrar uno nuevo.',
            'new_client.name.required_without' => 'Debe ingresar el nombre del cliente.',
            'new_client.dni.required_without' => 'Debe ingresar el DNI del cliente.',
            'new_client.phone.required_without' => 'Debe ingresar el telefono del cliente.',
        ];
    }
}
