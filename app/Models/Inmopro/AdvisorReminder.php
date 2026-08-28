<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvisorReminder extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'client_id',
        'title',
        'notes',
        'remind_at',
        'completed_at',
        'notified_at',
        'google_event_id',
        'source',
        'google_updated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'completed_at' => 'datetime',
            'notified_at' => 'datetime',
            'google_updated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Recordatorios CRM propios o eventos importados desde Google sin cliente.
     *
     * @param  Builder<AdvisorReminder>  $query
     * @return Builder<AdvisorReminder>
     */
    public function scopeVisibleForAdvisor(Builder $query): Builder
    {
        return $query->where(function (Builder $nested): void {
            $nested->whereNull('client_id')
                ->orWhereHas('client', fn (Builder $clientQuery) => $clientQuery->whereHas('type', fn (Builder $typeQuery) => $typeQuery->whereIn('code', ['PROPIO', 'DATERO'])));
        });
    }

    /**
     * @param  Builder<AdvisorReminder>  $query
     * @return Builder<AdvisorReminder>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('completed_at');
    }
}
