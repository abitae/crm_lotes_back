<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotPaymentAllocation extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'lot_payment_id',
        'lot_installment_id',
        'amount',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<LotPayment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(LotPayment::class, 'lot_payment_id');
    }

    /**
     * @return BelongsTo<LotInstallment, $this>
     */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(LotInstallment::class, 'lot_installment_id');
    }
}
