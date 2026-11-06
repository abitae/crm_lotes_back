<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLotStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $id = $this->route('lot_status')->id ?? 0;

        return [
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:50', 'unique:lot_statuses,code,'.$id],
            'color' => ['nullable', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
