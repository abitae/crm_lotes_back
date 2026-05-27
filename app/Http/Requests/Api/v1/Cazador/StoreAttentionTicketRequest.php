<?php

namespace App\Http\Requests\Api\v1\Cazador;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

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
            'attention_ticket_type_id' => ['nullable', 'exists:attention_ticket_types,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
