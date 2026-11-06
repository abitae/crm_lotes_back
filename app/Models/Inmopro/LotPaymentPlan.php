<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LotPaymentPlan extends Model
{
    public const STATUS_ACTIVE = 'ACTIVO';

    public const STATUS_REPLACED = 'REEMPLAZADO';

    public const FREQUENCY_MONTHLY = 'MENSUAL';

    public const FREQUENCY_BIWEEKLY = 'QUINCENAL';

    public const FREQUENCY_WEEKLY = 'SEMANAL';

    /**
     * @var list<string>
     */
    public const FREQUENCIES = [self::FREQUENCY_MONTHLY, self::FREQUENCY_BIWEEKLY, self::FREQUENCY_WEEKLY];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'lot_id',
        'financed_amount',
        'installments_count',
        'frequency',
        'first_due_date',
        'status',
        'created_by',
        'replaced_at',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'financed_amount' => 'decimal:2',
            'installments_count' => 'integer',
            'first_due_date' => 'date',
            'replaced_at' => 'datetime',
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
     * @return HasMany<LotInstallment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(LotInstallment::class, 'lot_payment_plan_id')->orderBy('sequence');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
