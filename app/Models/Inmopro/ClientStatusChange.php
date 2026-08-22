<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientStatusChange extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'client_id',
        'from_status_id',
        'to_status_id',
        'advisor_id',
        'reminder_id',
    ];

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<ClientStatus, $this>
     */
    public function fromStatus(): BelongsTo
    {
        return $this->belongsTo(ClientStatus::class, 'from_status_id');
    }

    /**
     * @return BelongsTo<ClientStatus, $this>
     */
    public function toStatus(): BelongsTo
    {
        return $this->belongsTo(ClientStatus::class, 'to_status_id');
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    /**
     * @return BelongsTo<AdvisorReminder, $this>
     */
    public function reminder(): BelongsTo
    {
        return $this->belongsTo(AdvisorReminder::class, 'reminder_id');
    }
}
