<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
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
            'location' => ['nullable', 'string', 'max:255'],
            'total_lots' => ['nullable', 'integer', 'min:0'],
            'blocks' => ['nullable', 'array'],
            'blocks.*' => ['string', 'max:10'],
            'is_active' => ['nullable', 'boolean'],
            'image_files' => ['nullable', 'array'],
            'image_files.*' => ['file', 'image', 'max:10240'],
            'document_files' => ['nullable', 'array'],
            'document_files.*' => ['file', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx', 'max:15360'],
        ];
    }
}
