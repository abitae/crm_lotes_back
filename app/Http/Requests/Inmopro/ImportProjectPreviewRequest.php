<?php

namespace App\Http\Requests\Inmopro;

use App\Rules\GoogleMapsUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportProjectPreviewRequest extends FormRequest
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
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
            'name' => ['nullable', 'string', 'max:255'],
            'project_type_id' => ['required', 'exists:project_types,id'],
            'location' => ['required', 'string', 'max:255', new GoogleMapsUrl],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Seleccione un archivo Excel.',
            'file.mimes' => 'El archivo debe ser Excel (.xlsx o .xls).',
            'file.max' => 'El archivo no debe superar 10 MB.',
            'project_type_id.required' => 'Seleccione el tipo de proyecto.',
            'project_type_id.exists' => 'El tipo de proyecto seleccionado no es válido.',
            'location.required' => 'Ingrese el enlace de Google Maps o las coordenadas del proyecto.',
        ];
    }
}
