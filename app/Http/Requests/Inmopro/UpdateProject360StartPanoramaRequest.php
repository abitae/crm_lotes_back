<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProject360StartPanoramaRequest extends FormRequest
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
            'panorama_id' => ['required', 'integer', 'exists:project_assets,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'panorama_id.required' => 'Selecciona el panorama inicial.',
            'panorama_id.exists' => 'El panorama seleccionado no existe.',
        ];
    }
}
