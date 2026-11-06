<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\Investor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvestorRequest extends FormRequest
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
        $investor = $this->route('investor');

        return [
            'person_type' => ['required', 'string', Rule::in(Investor::PERSON_TYPES)],
            'name' => ['required', 'string', 'max:255'],
            'document_type' => ['required', 'string', Rule::in(Investor::DOCUMENT_TYPES)],
            'document_number' => [
                'required',
                'string',
                'max:20',
                Rule::unique('investors', 'document_number')->ignore($investor instanceof Investor ? $investor->id : null),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'bank_account' => ['nullable', 'string', 'max:60'],
            'bank_cci' => ['nullable', 'string', 'max:60'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Indique el nombre o la razón social.',
            'document_number.required' => 'Indique el número de documento.',
            'document_number.unique' => 'Ya existe un inversionista con ese documento.',
            'email.email' => 'El correo no es válido.',
        ];
    }
}
