<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InvestorContract extends Model
{
    public const STATUS_DRAFT = 'BORRADOR';

    public const STATUS_ACTIVE = 'VIGENTE';

    public const STATUS_SETTLED = 'LIQUIDADO';

    public const STATUS_VOIDED = 'ANULADO';

    /**
     * @var list<string>
     */
    public const STATUSES = [self::STATUS_DRAFT, self::STATUS_ACTIVE, self::STATUS_SETTLED, self::STATUS_VOIDED];

    /** Paga solo interés en cada cuota y el capital en la última. */
    public const MODE_INTEREST_ONLY = 'INTERES_PERIODICO';

    /** Capital e interés repartidos en cuotas iguales. */
    public const MODE_EQUAL = 'CUOTAS_IGUALES';

    /** Una sola cuota con capital e interés al vencimiento. */
    public const MODE_BULLET = 'AL_VENCIMIENTO';

    /**
     * @var list<string>
     */
    public const PAYMENT_MODES = [self::MODE_INTEREST_ONLY, self::MODE_EQUAL, self::MODE_BULLET];

    public const RATE_TOTAL = 'TOTAL';

    public const RATE_MONTHLY = 'MENSUAL';

    public const RATE_ANNUAL = 'ANUAL';

    /**
     * @var list<string>
     */
    public const RATE_PERIODS = [self::RATE_TOTAL, self::RATE_MONTHLY, self::RATE_ANNUAL];

    /**
     * @var list<string>
     */
    public const CURRENCIES = ['PEN', 'USD'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'investor_id',
        'code',
        'project_id',
        'currency',
        'principal_amount',
        'received_at',
        'cash_account_id',
        'rate_percent',
        'rate_period',
        'payment_mode',
        'term_months',
        'installments_count',
        'frequency',
        'first_due_date',
        'withholding_percent',
        'total_interest',
        'total_payable',
        'status',
        'contract_path',
        'signed_at',
        'activated_at',
        'settled_at',
        'voided_at',
        'void_reason',
        'created_by',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'principal_amount' => 'decimal:2',
            'rate_percent' => 'decimal:4',
            'withholding_percent' => 'decimal:2',
            'total_interest' => 'decimal:2',
            'total_payable' => 'decimal:2',
            'term_months' => 'integer',
            'installments_count' => 'integer',
            'received_at' => 'date',
            'first_due_date' => 'date',
            'signed_at' => 'date',
            'activated_at' => 'datetime',
            'settled_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Investor, $this>
     */
    public function investor(): BelongsTo
    {
        return $this->belongsTo(Investor::class);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
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
     * @return HasMany<InvestorInstallment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(InvestorInstallment::class)->orderBy('sequence');
    }

    /**
     * @return HasMany<InvestorPayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(InvestorPayment::class);
    }

    /**
     * @return HasMany<CashEntry, $this>
     */
    public function cashEntries(): HasMany
    {
        return $this->hasMany(CashEntry::class);
    }

    public function isEditable(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }
}
