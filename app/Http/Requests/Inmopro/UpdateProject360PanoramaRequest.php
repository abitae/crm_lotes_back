<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProject360PanoramaRequest extends FormRequest
{
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
            'title' => ['required', 'string', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'El título del panorama es obligatorio.',
            'title.max' => 'El título no puede superar 100 caracteres.',
        ];
    }
}
