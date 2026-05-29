<?php

namespace App\Http\Requests\Inmopro\Concerns;

use Illuminate\Contracts\Validation\Validator;

trait ValidatesProjectAssetUploads
{
    /**
     * @return array<string, mixed>
     */
    protected function projectAssetUploadRules(): array
    {
        return [
            'image_files' => ['nullable', 'array'],
            'image_files.*' => ['file', 'image', 'max:10240'],
            'document_files' => ['nullable', 'array'],
            'document_files.*' => ['file', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx', 'max:15360'],
            'document_titles' => ['required_with:document_files', 'array'],
            'document_titles.*' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function projectAssetUploadMessages(): array
    {
        return [
            'document_titles.required_with' => 'Debe indicar un nombre por cada documento.',
            'document_titles.*.required' => 'El nombre del documento es obligatorio.',
            'document_titles.*.max' => 'El nombre del documento no puede superar :max caracteres.',
        ];
    }

    protected function validateProjectDocumentTitlesCount(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $fileCount = count($this->file('document_files') ?? []);
            $titleCount = count($this->input('document_titles') ?? []);

            if ($fileCount > 0 && $fileCount !== $titleCount) {
                $validator->errors()->add(
                    'document_titles',
                    'Debe indicar un nombre por cada documento subido.',
                );
            }
        });
    }
}
