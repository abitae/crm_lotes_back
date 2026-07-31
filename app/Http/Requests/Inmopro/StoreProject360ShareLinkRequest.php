<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class StoreProject360ShareLinkRequest extends FormRequest
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'label.max' => 'La etiqueta no puede superar 100 caracteres.',
        ];
    }
}
