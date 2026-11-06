<?php

namespace App\Http\Requests\Inmopro;

use App\Support\InstallmentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexAccountsReceivableRequest extends FormRequest
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
            'project_id' => ['nullable', 'integer'],
            'team_id' => ['nullable', 'integer'],
            'lot_status_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(InstallmentStatus::all())],
            'search' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'end_date.after_or_equal' => 'La fecha hasta debe ser igual o posterior a la fecha desde.',
            'status.in' => 'El estado de cuota no es válido.',
        ];
    }
}
