<?php

namespace App\Http\Requests\Api\v1\Web;

use App\Models\Inmopro\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexWebProjectsRequest extends FormRequest
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
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'search' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'project_type_id' => ['nullable', 'integer', 'exists:project_types,id'],
            'tipo_web' => ['required', 'string', Rule::in(Project::TIPO_WEB_SITES)],
            'has_free_lots' => ['nullable', 'boolean'],
            'has_images' => ['nullable', 'boolean'],
            'has_videos' => ['nullable', 'boolean'],
            'order' => ['nullable', 'string', Rule::in([
                'name',
                'name_desc',
                'lots_desc',
                'free_lots_desc',
            ])],
        ];
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? 15);
    }

    public function tipoWeb(): string
    {
        return (string) $this->validated('tipo_web');
    }
}
