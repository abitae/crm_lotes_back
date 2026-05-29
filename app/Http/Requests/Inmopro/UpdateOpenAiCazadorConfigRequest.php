<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOpenAiCazadorConfigRequest extends FormRequest
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
            'enabled' => ['required', 'boolean'],
            'model' => ['nullable', 'string', 'max:255'],
            'max_message_length' => ['required', 'integer', 'min:100', 'max:10000'],
            'rate_limit' => ['required', 'integer', 'min:1', 'max:120'],
            'knowledge_rate_limit' => ['required', 'integer', 'min:1', 'max:600'],
            'openai_api_key' => ['nullable', 'string', 'min:20', 'max:255'],
            'remove_openai_api_key' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'enabled.required' => 'Indica si el módulo está habilitado.',
            'max_message_length.min' => 'La longitud máxima del mensaje debe ser al menos 100 caracteres.',
            'max_message_length.max' => 'La longitud máxima del mensaje no puede superar 10 000 caracteres.',
            'rate_limit.min' => 'El límite de chat debe ser al menos 1 solicitud por minuto.',
            'knowledge_rate_limit.min' => 'El límite de conocimiento debe ser al menos 1 solicitud por minuto.',
            'openai_api_key.min' => 'La clave API debe tener al menos 20 caracteres.',
        ];
    }
}
