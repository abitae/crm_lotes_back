<?php

namespace App\Http\Requests\Api\v1\Cazador;

use App\Support\AdvisorCatalogRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateReminderRequest extends FormRequest
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
        $advisorId = (int) $this->attributes->get('advisor')?->id;

        return [
            'client_id' => ['required', 'exists:clients,id'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'remind_at' => ['required', 'date'],
            'client_status_id' => ['sometimes', 'nullable', 'integer', AdvisorCatalogRules::statusId($advisorId)],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', AdvisorCatalogRules::tagId($advisorId)],
        ];
    }
}
