<?php

namespace App\Http\Requests\Api\v1\Cazador;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttentionTicketRequest extends FormRequest
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
            'client_id' => ['required', 'exists:clients,id'],
            'project_id' => ['required', 'exists:projects,id'],
            'attention_ticket_type_id' => [
                'required',
                'integer',
                Rule::exists('attention_ticket_types', 'id')->where('is_active', true),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'attention_ticket_type_id.required' => 'Debe seleccionar un tipo de ticket.',
            'attention_ticket_type_id.exists' => 'El tipo de ticket no es válido o no está activo.',
        ];
    }
}
