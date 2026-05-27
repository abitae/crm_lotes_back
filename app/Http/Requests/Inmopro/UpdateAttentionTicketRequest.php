<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAttentionTicketRequest extends FormRequest
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
            'status' => ['sometimes', 'string', 'in:pendiente,agendado,realizado,cancelado'],
            'attention_ticket_type_id' => ['sometimes', 'exists:attention_ticket_types,id'],
            'scheduled_at' => ['nullable', 'date', Rule::requiredIf(fn (): bool => $this->input('status') === 'agendado')],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
