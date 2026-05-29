<?php

namespace App\Http\Requests\Api\v1\Cazador;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectAssetShareLinksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $max = (int) config('cazador.asset_share_link_max_assets', 20);

        return [
            'asset_ids' => ['required', 'array', 'min:1', 'max:'.$max],
            'asset_ids.*' => ['required', 'integer', 'distinct', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'asset_ids.required' => 'Debe indicar al menos un asset.',
            'asset_ids.min' => 'Debe indicar al menos un asset.',
            'asset_ids.max' => 'No puede solicitar más de :max assets por vez.',
            'asset_ids.*.distinct' => 'Los IDs de assets no deben repetirse.',
        ];
    }
}
