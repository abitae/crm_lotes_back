<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreProject360PanoramasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'panorama_files' => ['required', 'array', 'min:1', 'max:5'],
            'panorama_files.*' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:20480',
                'dimensions:min_width=2048,min_height=1024,max_width=8192,max_height=4096,ratio=2/1',
            ],
            'panorama_titles' => ['required', 'array', 'min:1', 'max:5'],
            'panorama_titles.*' => ['required', 'string', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'panorama_files.required' => 'Selecciona al menos una imagen panorámica.',
            'panorama_files.max' => 'Puedes subir hasta 5 panoramas por vez.',
            'panorama_files.*.mimes' => 'Cada panorama debe ser JPG, PNG o WebP.',
            'panorama_files.*.max' => 'Cada panorama puede pesar como máximo 20 MB.',
            'panorama_files.*.dimensions' => 'Cada panorama debe tener proporción 2:1 y una resolución entre 2048×1024 y 8192×4096.',
            'panorama_titles.*.required' => 'Indica un título para cada panorama.',
            'panorama_titles.*.max' => 'El título no puede superar 100 caracteres.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (count($this->file('panorama_files') ?? []) !== count($this->input('panorama_titles') ?? [])) {
                $validator->errors()->add('panorama_titles', 'Indica un título para cada panorama subido.');
            }
        });
    }
}
