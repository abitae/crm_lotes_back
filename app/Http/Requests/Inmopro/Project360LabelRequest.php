<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

abstract class Project360LabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'source_panorama_id' => ['required', 'integer', 'exists:project_assets,id'],
            'text' => ['required', 'string', 'max:120'],
            'yaw' => ['required', 'numeric', 'between:-180,180'],
            'pitch' => ['required', 'numeric', 'between:-85,85'],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'size' => ['required', 'numeric', 'between:0.50,3.00'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'text.required' => 'El texto de la etiqueta es obligatorio.',
            'text.max' => 'La etiqueta no puede superar 120 caracteres.',
            'yaw.between' => 'El giro horizontal debe estar entre -180 y 180 grados.',
            'pitch.between' => 'El giro vertical debe estar entre -85 y 85 grados.',
            'color.regex' => 'El color debe usar el formato hexadecimal #RRGGBB.',
            'size.between' => 'El tamaño debe estar entre 0.50 y 3.00.',
        ];
    }
}
