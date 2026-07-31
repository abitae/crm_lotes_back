<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreProject360FloorPlansRequest extends FormRequest
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
            'floor_plan_files' => ['required', 'array', 'min:1', 'max:5'],
            'floor_plan_files.*' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:20480',
                'dimensions:min_width=600,min_height=600,max_width=8192,max_height=8192',
            ],
            'floor_plan_titles' => ['required', 'array', 'min:1', 'max:5'],
            'floor_plan_titles.*' => ['required', 'string', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'floor_plan_files.required' => 'Selecciona al menos una imagen de plano.',
            'floor_plan_files.max' => 'Puedes subir hasta 5 planos por vez.',
            'floor_plan_files.*.mimes' => 'Cada plano debe ser JPG, PNG o WebP.',
            'floor_plan_files.*.max' => 'Cada plano puede pesar como máximo 20 MB.',
            'floor_plan_files.*.dimensions' => 'Cada plano debe tener una resolución entre 600×600 y 8192×8192.',
            'floor_plan_titles.*.required' => 'Indica un título para cada plano.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (count($this->file('floor_plan_files') ?? []) !== count($this->input('floor_plan_titles') ?? [])) {
                $validator->errors()->add('floor_plan_titles', 'Indica un título para cada plano subido.');
            }
        });
    }
}
