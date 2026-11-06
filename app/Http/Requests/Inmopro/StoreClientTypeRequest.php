<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientTypeRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', 'unique:client_types,code'],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
