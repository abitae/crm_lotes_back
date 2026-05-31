<?php

namespace App\Http\Requests\Inmopro;

use App\Http\Requests\Inmopro\Concerns\ValidatesProjectAssetUploads;
use App\Http\Requests\Inmopro\Concerns\ValidatesProjectWebAndLocationFields;
use App\Rules\GoogleMapsUrl;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    use ValidatesProjectAssetUploads;
    use ValidatesProjectWebAndLocationFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->prepareProjectWebAndLocationForValidation();
    }

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
            ...$this->projectWebAndLocationRules(requireTipoWebWhenWeb: true),
            ...$this->projectAssetUploadRules(),
        ];
    }

    public function messages(): array
    {
        return array_merge($this->projectAssetUploadMessages(), [
            'tipo_web.required_if' => 'Selecciona el sitio web cuando el proyecto es visible en la web.',
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $this->validateProjectDocumentTitlesCount($validator);
    }
}
