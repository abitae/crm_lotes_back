<?php

namespace App\Http\Requests\Crm;

use App\Models\Inmopro\Advisor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdvisorProfileRequest extends FormRequest
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
        /** @var Advisor|null $advisor */
        $advisor = $this->user('advisor');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'username' => ['required', 'string', 'max:255', Rule::unique('advisors', 'username')->ignore($advisor?->id)],
        ];
    }
}
