<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAdvisorLevelRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'direct_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'pyramid_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'color' => ['nullable', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
