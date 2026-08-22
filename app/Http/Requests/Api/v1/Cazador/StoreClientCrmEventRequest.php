<?php

namespace App\Http\Requests\Api\v1\Cazador;

use App\Services\Inmopro\ClientCrmService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClientCrmEventRequest extends FormRequest
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
            'action' => ['required', 'string', Rule::in(ClientCrmService::EXPLICIT_ACTIONS)],
            'meta' => ['sometimes', 'nullable', 'array'],
            'meta.preview' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'meta.kind' => ['sometimes', 'nullable', 'string', 'max:32'],
            'meta.reminder_id' => ['sometimes', 'nullable', 'integer'],
            'meta.project_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'action' => 'acción',
            'meta' => 'metadatos',
            'meta.preview' => 'vista previa del mensaje',
        ];
    }
}
