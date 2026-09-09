<?php

namespace App\Http\Requests\Crm;

use App\Support\AdvisorCatalogRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateClientCrmRequest extends FormRequest
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
        $advisorId = (int) $this->user('advisor')?->id;

        return [
            'client_status_id' => [
                'sometimes',
                'required',
                'integer',
                AdvisorCatalogRules::statusId($advisorId),
            ],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', AdvisorCatalogRules::tagId($advisorId)],
        ];
    }
}
