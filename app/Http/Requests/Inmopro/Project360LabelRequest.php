<?php

namespace App\Http\Requests\Inmopro;

use App\Support\Project360LabelStyle;
use Illuminate\Foundation\Http\FormRequest;

abstract class Project360LabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(Project360LabelStyle::mergeDefaults($this->all()));
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'source_panorama_id' => ['required', 'integer', 'exists:project_assets,id'],
            'text' => ['required', 'string', 'max:120'],
            'yaw' => ['required', 'numeric', 'between:-180,180'],
            'pitch' => ['required', 'numeric', 'between:-85,85'],
            ...Project360LabelStyle::rules(),
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
            'color.regex' => 'El color del texto debe usar el formato hexadecimal #RRGGBB.',
            'background_color.regex' => 'El color de fondo debe usar el formato hexadecimal #RRGGBB.',
            'border_color.regex' => 'El color del borde debe usar el formato hexadecimal #RRGGBB.',
            'border_width.between' => 'El grosor del borde debe estar entre 0 y 0.16.',
            'font.in' => 'El tipo de letra seleccionado no es válido.',
            'size.between' => 'El tamaño debe estar entre 0.50 y 3.00.',
            'width.between' => 'El ancho de la etiqueta debe estar entre 0.50 y 4.00.',
            'height.between' => 'El largo de la etiqueta debe estar entre 0.18 y 1.50.',
            'rotation.between' => 'El ángulo de la etiqueta debe estar entre -180 y 180 grados.',
            'shape.in' => 'La forma de la etiqueta no es válida.',
            'visibility.in' => 'La visibilidad de la etiqueta no es válida.',
        ];
    }
}
