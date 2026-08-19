<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLotRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $lot = $this->route('lot');

        $salePriceChanged = $this->has('sale_price') && $lot
            && ($this->input('sale_price') === null
                ? $lot->sale_price !== null
                : (float) $this->input('sale_price') !== (float) $lot->sale_price);
        $acquisitionCostChanged = $this->has('acquisition_cost') && $lot
            && ($this->input('acquisition_cost') === null
                ? $lot->acquisition_cost !== null
                : (float) $this->input('acquisition_cost') !== (float) $lot->acquisition_cost);

        if ($salePriceChanged || $acquisitionCostChanged) {
            return $this->user()?->can('inmopro.lots.financial.update') ?? false;
        }

        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'lot_status_id' => ['required', 'exists:lot_statuses,id'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'advisor_id' => ['nullable', 'exists:advisors,id'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'client_dni' => ['nullable', 'string', 'max:20'],
            'client_phone' => ['nullable', 'string', 'max:50'],
            'advance' => ['nullable', 'numeric', 'min:0'],
            'remaining_balance' => ['nullable', 'numeric', 'min:0'],
            'payment_limit_date' => ['nullable', 'date'],
            'operation_number' => ['nullable', 'string', 'max:50'],
            'contract_date' => ['nullable', 'date'],
            'contract_number' => ['nullable', 'string', 'max:50'],
            'notarial_transfer_date' => ['nullable', 'date'],
            'observations' => ['nullable', 'string', 'max:1000'],
            'block' => ['sometimes', 'string', 'max:10'],
            'number' => ['sometimes', 'string', 'max:20', 'regex:/^[A-Za-z0-9]+$/'],
            'area' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'list_price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'gt:0'],
            'acquisition_cost' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
