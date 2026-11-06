<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestorPaymentAllocation extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'investor_payment_id',
        'investor_installment_id',
        'amount',
        'interest_amount',
        'principal_amount',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'interest_amount' => 'decimal:2',
            'principal_amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<InvestorPayment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(InvestorPayment::class, 'investor_payment_id');
    }

    /**
     * @return BelongsTo<InvestorInstallment, $this>
     */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(InvestorInstallment::class, 'investor_installment_id');
    }
}
