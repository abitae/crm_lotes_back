<?php

namespace App\Http\Requests\Crm;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexClientRequest extends FormRequest
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
            'page' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'nullable', 'string', 'min:2', 'max:255'],
            'client_type' => ['sometimes', 'nullable', 'string', Rule::in(['PROPIO', 'DATERO'])],
            'client_status_id' => ['sometimes', 'nullable', 'integer', 'exists:client_statuses,id'],
            'tag_id' => ['sometimes', 'nullable', 'integer', 'exists:client_tags,id'],
        ];
    }
}
