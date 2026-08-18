<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UploadOpenAiCazadorKnowledgeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'expert_name' => ['required', 'string', 'max:120'],
            'knowledge_file' => ['required', 'file', 'max:1024', 'extensions:md,markdown', 'mimetypes:text/plain,text/markdown,application/octet-stream'],
        ];
    }

    public function messages(): array
    {
        return [
            'expert_name.required' => 'Indica el nombre del experto o personaje.',
            'expert_name.max' => 'El nombre del experto no puede superar 120 caracteres.',
            'knowledge_file.required' => 'Selecciona un archivo Markdown.',
            'knowledge_file.max' => 'El archivo no puede superar 1 MB.',
            'knowledge_file.extensions' => 'El archivo debe tener extensión .md o .markdown.',
        ];
    }
}
