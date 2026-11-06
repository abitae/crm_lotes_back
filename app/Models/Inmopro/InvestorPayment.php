<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InvestorPayment extends Model
{
    /**
     * @var list<string>
     */
    public const PAYMENT_METHODS = ['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'investor_contract_id',
        'cash_account_id',
        'amount',
        'withholding_amount',
        'net_amount',
        'paid_at',
        'payment_method',
        'reference',
        'voucher_path',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'withholding_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'paid_at' => 'date',
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
     * @return BelongsTo<CashAccount, $this>
     */
    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<InvestorPaymentAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(InvestorPaymentAllocation::class);
    }
}
