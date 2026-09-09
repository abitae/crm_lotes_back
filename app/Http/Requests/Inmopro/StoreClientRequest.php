<?php

namespace App\Http\Requests\Inmopro;

use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use App\Support\AdvisorCatalogRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        foreach (['dni', 'email', 'referred_by', 'city_id', 'client_status_id'] as $field) {
            if ($this->input($field) === '') {
                $merge[$field] = null;
            }
        }
        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'dni' => ['nullable', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'referred_by' => ['nullable', 'string', 'max:255'],
            'client_type_id' => ['required', 'exists:client_types,id'],
            'client_status_id' => ['nullable', 'integer', AdvisorCatalogRules::statusId((int) $this->input('advisor_id'))],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', AdvisorCatalogRules::tagId((int) $this->input('advisor_id'))],
            'city_id' => ['required', 'exists:cities,id'],
            'advisor_id' => ['required', 'exists:advisors,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            app(ClientDuplicateRegistrationChecker::class)->addValidationErrors(
                $validator,
                $this->input('dni'),
                $this->input('phone'),
                null,
            );
        });
    }
}
