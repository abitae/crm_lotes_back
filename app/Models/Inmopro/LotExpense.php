<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotExpense extends Model
{
    public const CATEGORY_TRANSFER = 'TRANSFERENCIA';

    public const CATEGORY_OTHER = 'OTRO';

    protected $fillable = [
        'lot_id', 'lot_transfer_confirmation_id', 'category', 'concept', 'amount',
        'expense_date', 'notes', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'expense_date' => 'date'];
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function transferConfirmation(): BelongsTo
    {
        return $this->belongsTo(LotTransferConfirmation::class, 'lot_transfer_confirmation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
