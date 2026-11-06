<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashEntry extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'cash_account_id',
        'lot_payment_id',
        'investor_contract_id',
        'investor_payment_id',
        'type',
        'concept',
        'amount',
        'entry_date',
        'reference',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'entry_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<CashAccount, $this>
     */
    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class, 'cash_account_id');
    }

    /**
     * @return BelongsTo<LotPayment, $this>
     */
    public function lotPayment(): BelongsTo
    {
        return $this->belongsTo(LotPayment::class, 'lot_payment_id');
    }
}
