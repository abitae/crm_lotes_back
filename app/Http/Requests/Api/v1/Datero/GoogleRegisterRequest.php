<?php

namespace App\Http\Requests\Api\v1\Datero;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GoogleRegisterRequest extends FormRequest
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
            'id_token' => ['required', 'string'],
            'dni' => ['required', 'string', 'max:20', 'unique:dateros,dni'],
            'phone' => ['required', 'string', 'max:50'],
            'city_id' => ['required', Rule::exists('cities', 'id')->where('is_active', true)],
            'advisor_id' => ['required', Rule::exists('advisors', 'id')->where('is_active', true)],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'dni' => 'DNI',
            'phone' => 'teléfono',
            'city_id' => 'ciudad',
            'advisor_id' => 'vendedor',
        ];
    }
}
