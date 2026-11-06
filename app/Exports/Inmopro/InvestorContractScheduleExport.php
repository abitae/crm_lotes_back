<?php

namespace App\Exports\Inmopro;

use App\Models\Inmopro\InvestorContract;
use App\Models\Inmopro\InvestorInstallment;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class InvestorContractScheduleExport implements FromCollection, WithHeadings, WithTitle
{
    public function __construct(
        private InvestorContract $contract
    ) {}

    public function title(): string
    {
        return $this->contract->code;
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Contrato',
            'Inversionista',
            'Moneda',
            'Cuota',
            'Vencimiento',
            'Capital',
            'Interés',
            'Total cuota',
            'Pagado',
            'Saldo',
            'Estado',
        ];
    }

    /**
     * @return Collection<int, array<int, string|int|float|null>>
     */
    public function collection(): Collection
    {
        return $this->contract->installments->map(fn (InvestorInstallment $installment): array => [
            $this->contract->code,
            $this->contract->investor?->name,
            $this->contract->currency,
            $installment->sequence,
            $installment->due_date?->format('d/m/Y'),
            (float) $installment->principal_amount,
            (float) $installment->interest_amount,
            (float) $installment->amount,
            (float) $installment->paid_amount,
            $installment->balance(),
            $installment->status,
        ]);
    }
}
