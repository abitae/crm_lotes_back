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
            'floor_plan_id' => ['nullable', 'integer', 'exists:project_assets,id'],
            'plan_x' => ['nullable', 'required_with:floor_plan_id', 'numeric', 'between:0,100'],
            'plan_y' => ['nullable', 'required_with:floor_plan_id', 'numeric', 'between:0,100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'initial_yaw.between' => 'El giro horizontal debe estar entre -180 y 180 grados.',
            'initial_pitch.between' => 'El giro vertical debe estar entre -85 y 85 grados.',
            'plan_x.required_with' => 'Selecciona la posición horizontal sobre el plano.',
            'plan_y.required_with' => 'Selecciona la posición vertical sobre el plano.',
            'plan_x.between' => 'La posición horizontal debe estar entre 0 y 100.',
            'plan_y.between' => 'La posición vertical debe estar entre 0 y 100.',
        ];
    }
}
