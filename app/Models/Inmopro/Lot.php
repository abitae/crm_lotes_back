<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lot extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'block',
        'number',
        'area',
        'price',
        'lot_status_id',
        'client_id',
        'advisor_id',
        'client_name',
        'client_dni',
        'advance',
        'remaining_balance',
        'payment_limit_date',
        'operation_number',
        'contract_date',
        'contract_number',
        'notarial_transfer_date',
        'observations',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'area' => 'decimal:2',
            'price' => 'decimal:2',
            'advance' => 'decimal:2',
            'remaining_balance' => 'decimal:2',
            'payment_limit_date' => 'date',
            'contract_date' => 'date',
            'notarial_transfer_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * @return BelongsTo<LotStatus, $this>
     */
    public function status(): BelongsTo
    {
        return $this->belongsTo(LotStatus::class, 'lot_status_id');
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class, 'advisor_id');
    }

    /**
     * @return HasMany<Commission, $this>
     */
    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class, 'lot_id');
    }

    /**
     * @return HasMany<AttentionTicket, $this>
     */
    public function attentionTickets(): HasMany
    {
        return $this->hasMany(AttentionTicket::class, 'lot_id');
    }

    /**
     * @return HasMany<LotInstallment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(LotInstallment::class, 'lot_id')->orderBy('sequence');
    }

    /**
     * @return HasMany<LotPayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(LotPayment::class, 'lot_id')->latest('paid_at');
    }

    /**
     * @return HasMany<LotPreReservation, $this>
     */
    public function preReservations(): HasMany
    {
        return $this->hasMany(LotPreReservation::class, 'lot_id')->latest();
    }

    /**
     * @return HasMany<LotTransferConfirmation, $this>
     */
    public function transferConfirmations(): HasMany
    {
        return $this->hasMany(LotTransferConfirmation::class, 'lot_id')->latest();
    }

    /**
     * @return HasOne<LotTransferConfirmation, $this>
     */
    public function latestTransferConfirmation(): HasOne
    {
        return $this->hasOne(LotTransferConfirmation::class, 'lot_id')->latestOfMany();
    }
}
