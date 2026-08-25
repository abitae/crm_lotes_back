<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LotPayment extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'lot_id',
        'lot_installment_id',
        'cash_account_id',
        'amount',
        'paid_at',
        'payment_method',
        'reference',
        'notes',
        'voucher_path',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Lot, $this>
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id');
    }

    /**
     * @return BelongsTo<LotInstallment, $this>
     */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(LotInstallment::class, 'lot_installment_id');
    }

    /**
     * @return BelongsTo<CashAccount, $this>
     */
    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class, 'cash_account_id');
    }

    /**
     * @return HasMany<CashEntry, $this>
     */
    public function cashEntries(): HasMany
    {
        return $this->hasMany(CashEntry::class, 'lot_payment_id');
    }
}
