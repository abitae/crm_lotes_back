<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCashAccountRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:CAJA,BANCO'],
            'currency' => ['required', 'string', 'size:3'],
            'initial_balance' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
