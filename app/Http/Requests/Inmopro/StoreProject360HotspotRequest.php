<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class StoreProject360HotspotRequest extends FormRequest
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
            'source_panorama_id' => ['required', 'integer', 'exists:project_assets,id'],
            'target_panorama_id' => ['required', 'integer', 'different:source_panorama_id', 'exists:project_assets,id'],
            'label' => ['required', 'string', 'max:100'],
            'yaw' => ['required', 'numeric', 'between:-180,180'],
            'pitch' => ['required', 'numeric', 'between:-85,85'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'target_panorama_id.different' => 'El destino debe ser distinto del panorama de origen.',
            'label.required' => 'La etiqueta del hotspot es obligatoria.',
            'label.max' => 'La etiqueta no puede superar 100 caracteres.',
            'yaw.between' => 'El giro horizontal debe estar entre -180 y 180 grados.',
            'pitch.between' => 'El giro vertical debe estar entre -85 y 85 grados.',
        ];
    }
}
