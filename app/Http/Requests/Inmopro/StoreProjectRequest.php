<?php

namespace App\Http\Requests\Inmopro;

use App\Http\Requests\Inmopro\Concerns\ValidatesProjectAssetUploads;
use App\Rules\GoogleMapsUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    use ValidatesProjectAssetUploads;

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
            'project_type_id' => ['nullable', 'exists:project_types,id'],
            'location' => ['nullable', 'string', 'max:255', new GoogleMapsUrl],
            'total_lots' => ['nullable', 'integer', 'min:0'],
            'blocks' => ['nullable', 'array'],
            'blocks.*' => ['string', 'max:10'],
            'is_active' => ['nullable', 'boolean'],
            ...$this->projectAssetUploadRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->projectAssetUploadMessages();
    }

    public function withValidator(Validator $validator): void
    {
        $this->validateProjectDocumentTitlesCount($validator);
    }
}
