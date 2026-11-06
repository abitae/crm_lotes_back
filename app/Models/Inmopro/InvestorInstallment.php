<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InvestorInstallment extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'investor_contract_id',
        'sequence',
        'due_date',
        'principal_amount',
        'interest_amount',
        'amount',
        'paid_amount',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'principal_amount' => 'decimal:2',
            'interest_amount' => 'decimal:2',
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'sequence' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<InvestorContract, $this>
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(InvestorContract::class, 'investor_contract_id');
    }

    /**
     * @return HasMany<InvestorPaymentAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(InvestorPaymentAllocation::class);
    }

    public function balance(): float
    {
        return max(0, round((float) $this->amount - (float) $this->paid_amount, 2));
    }
}
