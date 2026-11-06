<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientTypeRequest extends FormRequest
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
        $clientType = $this->route('client_type');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', Rule::unique('client_types', 'code')->ignore($clientType)],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
