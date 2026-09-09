<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\Client;
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
        $client = $this->route('client');
        $advisorId = $client instanceof Client ? (int) $client->advisor_id : 0;

        return [
            'client_status_id' => ['nullable', 'integer', AdvisorCatalogRules::statusId($advisorId)],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', AdvisorCatalogRules::tagId($advisorId)],
        ];
    }
}
