<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ApproveLotPreReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
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
            'review_notes' => ['required', 'string', 'max:1000'],
            'sale_price' => ['required', 'numeric', 'gt:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'review_notes.required' => 'Debe ingresar una reseña antes de aprobar.',
            'sale_price.required' => 'Debe ingresar el precio real de venta.',
            'sale_price.gt' => 'El precio real de venta debe ser mayor que cero.',
        ];
    }
}
