<?php

namespace App\Http\Requests\Api\v1\Cazador;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Pagination\Cursor;
use Illuminate\Validation\Rule;

class IndexClientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cursor' => [
                'sometimes',
                'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value !== null && Cursor::fromEncoded((string) $value) === null) {
                        $fail('El cursor de paginación no es válido.');
                    }
                },
            ],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'min:2', 'max:255'],
            'client_type' => ['sometimes', 'nullable', 'string', Rule::in(['PROPIO', 'DATERO'])],
            'client_status_id' => ['sometimes', 'nullable', 'integer', 'exists:client_statuses,id'],
            'tag_id' => ['sometimes', 'nullable', 'integer', 'exists:client_tags,id'],
        ];
    }
}
