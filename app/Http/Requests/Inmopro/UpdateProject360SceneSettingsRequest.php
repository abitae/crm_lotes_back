<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProject360SceneSettingsRequest extends FormRequest
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
            'initial_yaw' => ['required', 'numeric', 'between:-180,180'],
            'initial_pitch' => ['required', 'numeric', 'between:-85,85'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'initial_yaw.between' => 'El giro horizontal debe estar entre -180 y 180 grados.',
            'initial_pitch.between' => 'El giro vertical debe estar entre -85 y 85 grados.',
        ];
    }
}
