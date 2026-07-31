<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProject360TourSettingsRequest extends FormRequest
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
            'accent_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'hotspot_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'hotspot_hover_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'hotspot_text_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'hotspot_size' => ['required', 'numeric', 'between:0.08,0.50'],
            'hotspot_shape' => ['required', 'in:sphere,ring,pin'],
            'hotspot_label_visibility' => ['required', 'in:always,hover,hidden'],
            'hotspot_pulse_enabled' => ['required', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            '*.regex' => 'Los colores deben usar el formato hexadecimal #RRGGBB.',
            'hotspot_size.between' => 'El tamaño debe estar entre 0.08 y 0.50.',
            'hotspot_shape.in' => 'La forma seleccionada no es válida.',
            'hotspot_label_visibility.in' => 'La visibilidad de etiqueta no es válida.',
        ];
    }
}
