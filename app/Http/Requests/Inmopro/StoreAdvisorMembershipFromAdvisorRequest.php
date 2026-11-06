<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAdvisorMembershipFromAdvisorRequest extends FormRequest
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
            'membership_type_id' => ['required', 'exists:membership_types,id'],
            'start_date' => ['required', 'date'],
            'installments_count' => ['nullable', 'integer', 'min:1', 'max:60'],
        ];
    }
}
