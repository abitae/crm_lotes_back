<?php

namespace App\OpenAi\Http\Requests\Api\v1\Cazador;

use Illuminate\Foundation\Http\FormRequest;

class ChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $max = (int) config('openai_cazador.max_message_length', 2000);

        return [
            'message' => ['required', 'string', 'max:'.$max],
            'conversation_id' => ['nullable', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'message.required' => 'El mensaje es obligatorio.',
            'message.max' => 'El mensaje no puede superar :max caracteres.',
            'conversation_id.uuid' => 'El identificador de conversación no es válido.',
        ];
    }
}
