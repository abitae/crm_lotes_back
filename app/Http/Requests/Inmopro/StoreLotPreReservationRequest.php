<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class StoreLotPreReservationRequest extends FormRequest
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
            'project_id' => ['required', 'exists:projects,id,is_active,1'],
            'lot_id' => ['required', 'exists:lots,id'],
            'advisor_id' => ['required', 'exists:advisors,id'],
            'client_id' => ['required', 'exists:clients,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'voucher_image' => ['required', 'image', 'max:5120'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'voucher_image.required' => 'Debe adjuntar el voucher de la pre-reserva.',
            'amount.required' => 'Debe ingresar el monto de la pre-reserva.',
        ];
    }
}
