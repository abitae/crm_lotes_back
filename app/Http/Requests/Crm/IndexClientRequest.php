<?php

namespace App\Http\Requests\Crm;

use App\Support\AdvisorCatalogRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexClientRequest extends FormRequest
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
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'nullable', 'integer'],
            'search' => ['sometimes', 'nullable', 'string', 'min:2', 'max:255'],
            'client_type' => ['sometimes', 'nullable', 'string', Rule::in(['PROPIO', 'DATERO'])],
            'client_status_id' => ['sometimes', 'nullable', 'integer', AdvisorCatalogRules::statusId($advisorId, false)],
            'tag_id' => ['sometimes', 'nullable', 'integer', AdvisorCatalogRules::tagId($advisorId, false)],
            'city_id' => ['sometimes', 'nullable', 'integer', 'exists:cities,id'],
            'created_from' => ['sometimes', 'nullable', 'date'],
            'created_to' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
