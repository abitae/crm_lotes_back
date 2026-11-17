<?php

namespace App\Http\Requests\Inmopro;

use App\Services\Inmopro\LotReleaseService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReleaseLotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('inmopro.lots.release') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', Rule::in(array_keys(LotReleaseService::REASONS))],
            'notes' => ['nullable', 'required_if:reason,OTRO', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Seleccione el motivo de la liberación.',
            'reason.in' => 'El motivo seleccionado no es válido.',
            'notes.required_if' => 'Describa el motivo de la liberación.',
        ];
    }
}
