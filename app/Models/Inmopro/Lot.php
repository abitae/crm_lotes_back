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
        'list_price',
        'sale_price',
        'acquisition_cost',
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
            'list_price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'acquisition_cost' => 'decimal:2',
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
     * @return HasMany<Project360Polygon, $this>
     */
    public function project360Polygons(): HasMany
    {
        return $this->hasMany(Project360Polygon::class, 'lot_id');
    }

    /**
     * @return HasMany<ProjectFlatPolygon, $this>
     */
    public function projectFlatPolygons(): HasMany
    {
        return $this->hasMany(ProjectFlatPolygon::class, 'lot_id');
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

    public function expenses(): HasMany
    {
        return $this->hasMany(LotExpense::class)->latest('expense_date');
    }

    public function financialMetrics(): array
    {
        $salePrice = $this->sale_price !== null ? (float) $this->sale_price : null;
        $listPrice = (float) ($this->list_price ?? $this->price ?? 0);
        $expenses = (float) ($this->expenses_sum_amount ?? $this->expenses()->sum('amount'));
        $commissions = (float) ($this->commissions_sum_amount ?? $this->commissions()->sum('amount'));
        $profit = $salePrice !== null && $this->acquisition_cost !== null
            ? round($salePrice - (float) $this->acquisition_cost - $expenses - $commissions, 2)
            : null;

        return [
            'list_price' => $listPrice,
            'sale_price' => $salePrice,
            'acquisition_cost' => $this->acquisition_cost !== null ? (float) $this->acquisition_cost : null,
            'price_variance' => $salePrice !== null ? round($salePrice - $listPrice, 2) : null,
            'expenses_total' => round($expenses, 2),
            'commissions_total' => round($commissions, 2),
            'net_profit' => $profit,
            'profit_margin' => $profit !== null && $salePrice > 0 ? round(($profit / $salePrice) * 100, 2) : null,
        ];
    }

    /**
     * @return HasOne<LotTransferConfirmation, $this>
     */
    public function latestTransferConfirmation(): HasOne
    {
        return $this->hasOne(LotTransferConfirmation::class, 'lot_id')->latestOfMany();
    }
}
