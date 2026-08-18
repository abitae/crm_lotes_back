<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected static function booted(): void
    {
        static::saving(function (Client $client): void {
            $client->phone_normalized = self::normalizeNumericSearchValue($client->phone);
            $client->dni_normalized = self::normalizeNumericSearchValue($client->dni);
        });
    }

    private static function normalizeNumericSearchValue(?string $value): ?string
    {
        $normalized = preg_replace('/\D+/', '', trim((string) $value)) ?? '';

        return $normalized !== '' ? $normalized : null;
    }

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'dni',
        'phone',
        'email',
        'referred_by',
        'client_type_id',
        'city_id',
        'advisor_id',
        'registered_by_datero_id',
    ];

    /**
     * @return BelongsTo<ClientType, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(ClientType::class, 'client_type_id');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    /**
     * @return BelongsTo<Datero, $this>
     */
    public function registeredByDatero(): BelongsTo
    {
        return $this->belongsTo(Datero::class, 'registered_by_datero_id');
    }

    /**
     * @return HasMany<Lot, $this>
     */
    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class, 'client_id');
    }

    /**
     * @return HasMany<AttentionTicket, $this>
     */
    public function attentionTickets(): HasMany
    {
        return $this->hasMany(AttentionTicket::class, 'client_id');
    }

    /**
     * @return HasMany<AdvisorAgendaEvent, $this>
     */
    public function agendaEvents(): HasMany
    {
        return $this->hasMany(AdvisorAgendaEvent::class, 'client_id');
    }

    /**
     * @return HasMany<AdvisorReminder, $this>
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(AdvisorReminder::class, 'client_id');
    }
}
