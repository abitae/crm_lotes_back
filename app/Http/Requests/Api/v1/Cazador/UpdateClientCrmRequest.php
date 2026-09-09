<?php

namespace App\Http\Requests\Api\v1\Cazador;

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
        $advisorId = (int) $this->attributes->get('advisor')?->id;

        return [
            'client_status_id' => ['sometimes', 'nullable', 'integer', AdvisorCatalogRules::statusId($advisorId)],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', AdvisorCatalogRules::tagId($advisorId)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'client_status_id' => 'estado de seguimiento',
            'tag_ids' => 'etiquetas',
        ];
    }
}
