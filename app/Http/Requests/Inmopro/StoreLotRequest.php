<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreLotRequest extends FormRequest
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
            'project_id' => ['required', 'exists:projects,id,is_active,1'],
            'block' => ['required', 'string', 'max:10'],
            'number' => ['required', 'string', 'max:20', 'regex:/^[A-Za-z0-9]+$/'],
            'area' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'lot_status_id' => ['required', 'exists:lot_statuses,id'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'advisor_id' => ['nullable', 'exists:advisors,id'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'client_dni' => ['nullable', 'string', 'max:20'],
            'advance' => ['nullable', 'numeric', 'min:0'],
            'remaining_balance' => ['nullable', 'numeric', 'min:0'],
            'payment_limit_date' => ['nullable', 'date'],
            'operation_number' => ['nullable', 'string', 'max:50'],
            'contract_date' => ['nullable', 'date'],
            'contract_number' => ['nullable', 'string', 'max:50'],
            'notarial_transfer_date' => ['nullable', 'date'],
            'observations' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
