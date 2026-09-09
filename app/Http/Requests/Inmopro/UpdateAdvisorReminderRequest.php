<?php

namespace App\Http\Requests\Inmopro;

use App\Support\AdvisorCatalogRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdvisorReminderRequest extends FormRequest
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
        $advisorId = $this->input('advisor_id');

        return [
            'advisor_id' => ['required', 'exists:advisors,id'],
            'client_id' => [
                'required',
                'exists:clients,id',
                Rule::exists('clients', 'id')->where('advisor_id', $advisorId),
            ],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'remind_at' => ['required', 'date'],
            'client_status_id' => ['sometimes', 'nullable', 'integer', AdvisorCatalogRules::statusId((int) $advisorId)],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', AdvisorCatalogRules::tagId((int) $advisorId)],
        ];
    }
}
