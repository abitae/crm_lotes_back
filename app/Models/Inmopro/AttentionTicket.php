<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AttentionTicket extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'client_id',
        'project_id',
        'lot_id',
        'attention_ticket_type_id',
        'scheduled_at',
        'status',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class, 'advisor_id');
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * @return BelongsTo<Lot, $this>
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id');
    }

    /**
     * @return BelongsTo<AttentionTicketType, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(AttentionTicketType::class, 'attention_ticket_type_id');
    }

    /**
     * @return HasOne<DeliveryDeed, $this>
     */
    public function deliveryDeed(): HasOne
    {
        return $this->hasOne(DeliveryDeed::class, 'attention_ticket_id');
    }
}
