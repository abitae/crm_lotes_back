<?php

namespace App\OpenAi\Http\Requests\Api\v1\Cazador;

use Illuminate\Contracts\Validation\Validator;
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $message = (string) $this->input('message', '');
            $containsEmail = preg_match('/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i', $message) === 1;
            $containsPersonalNumber = preg_match('/(?<!\d)(?:\d[\s-]*){8,9}(?!\d)/', $message) === 1;
            if ($containsEmail || $containsPersonalNumber) {
                $validator->errors()->add('message', 'No incluyas DNI, teléfono, correo ni otros datos personales en el asistente.');
            }
        });
    }
}
