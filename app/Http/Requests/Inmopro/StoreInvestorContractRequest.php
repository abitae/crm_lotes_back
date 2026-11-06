<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\InvestorContract;
use App\Support\ScheduleMath;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvestorContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('payment_mode') === InvestorContract::MODE_BULLET) {
            $this->merge(['installments_count' => 1]);
        }

        if (! $this->filled('frequency')) {
            $this->merge(['frequency' => ScheduleMath::FREQUENCY_MONTHLY]);
        }

        if (! $this->filled('withholding_percent')) {
            $this->merge(['withholding_percent' => 0]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'currency' => ['required', 'string', Rule::in(InvestorContract::CURRENCIES)],
            'principal_amount' => ['required', 'numeric', 'min:1', 'max:9999999999'],
            'received_at' => ['required', 'date'],
            'cash_account_id' => ['nullable', 'integer', Rule::exists('cash_accounts', 'id')->where('is_active', true)],
            'rate_percent' => ['required', 'numeric', 'min:0', 'max:1000'],
            'rate_period' => ['required', 'string', Rule::in(InvestorContract::RATE_PERIODS)],
            'payment_mode' => ['required', 'string', Rule::in(InvestorContract::PAYMENT_MODES)],
            'term_months' => ['required', 'integer', 'min:1', 'max:600'],
            'installments_count' => ['required', 'integer', 'min:1', 'max:360'],
            'frequency' => ['required', 'string', Rule::in(ScheduleMath::FREQUENCIES)],
            'first_due_date' => ['required', 'date', 'after_or_equal:received_at'],
            'withholding_percent' => ['numeric', 'min:0', 'max:100'],
            'signed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'contract_file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'installments' => ['nullable', 'array', 'max:360'],
            'installments.*.due_date' => ['required', 'date'],
            'installments.*.principal_amount' => ['required', 'numeric', 'min:0'],
            'installments.*.interest_amount' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'principal_amount.required' => 'Indique el monto que presta el inversionista.',
            'principal_amount.min' => 'El monto prestado debe ser mayor a cero.',
            'received_at.required' => 'Indique la fecha en que se recibió el dinero.',
            'rate_percent.required' => 'Indique el porcentaje de ganancia.',
            'rate_period.in' => 'El periodo de la tasa debe ser sobre el plazo total, mensual o anual.',
            'payment_mode.in' => 'Elija una modalidad de pago válida.',
            'term_months.required' => 'Indique el plazo en meses.',
            'installments_count.max' => 'El cronograma admite como máximo 360 cuotas.',
            'first_due_date.required' => 'Indique la fecha del primer pago.',
            'first_due_date.after_or_equal' => 'El primer pago no puede ser anterior a la recepción del dinero.',
            'cash_account_id.exists' => 'La caja seleccionada no existe o está inactiva.',
            'contract_file.mimes' => 'El contrato debe ser PDF o imagen.',
            'installments.*.due_date.required' => 'Cada cuota debe tener fecha.',
        ];
    }
}
