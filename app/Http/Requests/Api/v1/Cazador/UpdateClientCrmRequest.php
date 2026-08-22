<?php

namespace App\Http\Requests\Api\v1\Cazador;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientCrmRequest extends FormRequest
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
            'client_status_id' => ['sometimes', 'nullable', 'integer', Rule::exists('client_statuses', 'id')->where('is_active', true)],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', Rule::exists('client_tags', 'id')->where('is_active', true)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'client_status_id' => 'estado de seguimiento',
            'tag_ids' => 'etiquetas',
        ];
    }
}
