<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\LotPaymentPlan;
use App\Services\Inmopro\PaymentScheduleService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLotPaymentScheduleRequest extends FormRequest
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
            'mode' => ['required', 'string', Rule::in(PaymentScheduleService::MODES)],
            'installments_count' => ['required', 'integer', 'min:1', 'max:360'],
            'frequency' => ['required', 'string', Rule::in(LotPaymentPlan::FREQUENCIES)],
            'first_due_date' => ['required', 'date'],
            'financed_amount' => ['nullable', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mode.in' => 'Elija si desea agregar cuotas o reprogramar el cronograma.',
            'installments_count.required' => 'Indique el número de cuotas.',
            'installments_count.min' => 'Debe generar al menos una cuota.',
            'installments_count.max' => 'El cronograma admite como máximo 360 cuotas.',
            'frequency.in' => 'La frecuencia debe ser mensual, quincenal o semanal.',
            'first_due_date.required' => 'Indique la fecha de la primera cuota.',
            'financed_amount.min' => 'El monto a financiar debe ser mayor a cero.',
        ];
    }
}
