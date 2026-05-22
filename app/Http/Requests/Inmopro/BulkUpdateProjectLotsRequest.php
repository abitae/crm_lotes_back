<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkUpdateProjectLotsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Project $project */
        $project = $this->route('project');

        return [
            'lots' => ['required', 'array', 'min:1'],
            'lots.*.id' => [
                'required',
                'integer',
                Rule::exists('lots', 'id')->where(fn ($query) => $query->where('project_id', $project->id)),
            ],
            'lots.*.lot_status_id' => ['required', 'exists:lot_statuses,id'],
            'lots.*.client_id' => ['nullable', 'exists:clients,id'],
            'lots.*.advisor_id' => ['nullable', 'exists:advisors,id'],
            'lots.*.client_name' => ['nullable', 'string', 'max:255'],
            'lots.*.client_dni' => ['nullable', 'string', 'max:20'],
            'lots.*.client_phone' => ['nullable', 'string', 'max:50'],
            'lots.*.advance' => ['nullable', 'numeric', 'min:0'],
            'lots.*.remaining_balance' => ['nullable', 'numeric', 'min:0'],
            'lots.*.payment_limit_date' => ['nullable', 'date'],
            'lots.*.operation_number' => ['nullable', 'string', 'max:50'],
            'lots.*.contract_date' => ['nullable', 'date'],
            'lots.*.contract_number' => ['nullable', 'string', 'max:50'],
            'lots.*.notarial_transfer_date' => ['nullable', 'date'],
            'lots.*.observations' => ['nullable', 'string', 'max:1000'],
            'lots.*.block' => ['sometimes', 'string', 'max:10'],
            'lots.*.number' => ['sometimes', 'integer', 'min:1'],
            'lots.*.area' => ['nullable', 'numeric', 'min:0'],
            'lots.*.price' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lots.required' => 'No hay lotes para guardar.',
            'lots.min' => 'Debe incluir al menos un lote con cambios.',
        ];
    }
}
