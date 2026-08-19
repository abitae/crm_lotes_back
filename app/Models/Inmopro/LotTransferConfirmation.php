<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LotTransferConfirmation extends Model
{
    public const STATUS_PENDING = 'PENDIENTE';

    public const STATUS_APPROVED = 'APROBADA';

    public const STATUS_REJECTED = 'RECHAZADA';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'lot_id',
        'status',
        'evidence_path',
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'notes',
        'rejection_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Lot, $this>
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(LotExpense::class);
    }
}
