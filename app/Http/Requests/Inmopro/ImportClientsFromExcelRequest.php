<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportClientsFromExcelRequest extends FormRequest
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
        ];
    }
}
