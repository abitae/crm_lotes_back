<?php

namespace App\Models\Inmopro;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Hash;

/**
 * @property-read string $name Nombre para mostrar consolidado (nombres + apellidos).
 */
class Advisor extends Model implements AuthenticatableContract
{
    use Authenticatable;

    /**
     * @var list<string>
     */
    protected $hidden = [
        'pin',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'dni',
        'phone',
        'email',
        'city_id',
        'username',
        'pin',
        'is_active',
        'last_login_at',
        'team_id',
        'advisor_level_id',
        'superior_id',
        'personal_quota',
        'birth_date',
        'joined_at',
        'first_name',
        'last_name',
        'bank_name',
        'bank_account_number',
        'bank_cci',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'personal_quota' => 'decimal:2',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'birth_date' => 'date',
            'joined_at' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Advisor $advisor): void {
            $first = trim((string) ($advisor->first_name ?? ''));
            $last = trim((string) ($advisor->last_name ?? ''));
            $parts = array_filter([$first, $last], static fn (string $p): bool => $p !== '');
            if ($parts !== []) {
                $advisor->name = implode(' ', $parts);
            }
        });
    }

    /**
     * @return Attribute<string|null, string|null>
     */
    protected function pin(): Attribute
    {
        return Attribute::make(
            set: static function (?string $value): ?string {
                if ($value === null || $value === '') {
                    return null;
                }

                return Hash::needsRehash($value) ? Hash::make($value) : $value;
            },
        );
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    /**
     * @return BelongsTo<AdvisorLevel, $this>
     */
    public function level(): BelongsTo
    {
        return $this->belongsTo(AdvisorLevel::class, 'advisor_level_id');
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function superior(): BelongsTo
    {
        return $this->belongsTo(Advisor::class, 'superior_id');
    }

    /**
     * @return HasMany<Advisor, $this>
     */
    public function subordinates(): HasMany
    {
        return $this->hasMany(Advisor::class, 'superior_id');
    }

    /**
     * @return HasMany<Lot, $this>
     */
    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class, 'advisor_id');
    }

    /**
     * @return HasMany<Client, $this>
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'advisor_id');
    }

    /**
     * @return HasMany<Commission, $this>
     */
    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class, 'advisor_id');
    }

    /**
     * @return HasMany<AdvisorMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(AdvisorMembership::class);
    }

    /**
     * @return HasMany<AdvisorApiToken, $this>
     */
    public function apiTokens(): HasMany
    {
        return $this->hasMany(AdvisorApiToken::class);
    }

    /**
     * @return HasMany<LotPreReservation, $this>
     */
    public function preReservations(): HasMany
    {
        return $this->hasMany(LotPreReservation::class);
    }

    /**
     * @return HasMany<AttentionTicket, $this>
     */
    public function attentionTickets(): HasMany
    {
        return $this->hasMany(AttentionTicket::class, 'advisor_id');
    }

    /**
     * @return HasMany<AdvisorAgendaEvent, $this>
     */
    public function agendaEvents(): HasMany
    {
        return $this->hasMany(AdvisorAgendaEvent::class, 'advisor_id');
    }

    /**
     * @return HasMany<AdvisorReminder, $this>
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(AdvisorReminder::class, 'advisor_id');
    }

    /**
     * @return HasMany<Datero, $this>
     */
    public function dateros(): HasMany
    {
        return $this->hasMany(Datero::class, 'advisor_id');
    }

    /**
     * @return HasMany<AdvisorMaterialItem, $this>
     */
    public function materialItems(): HasMany
    {
        return $this->hasMany(AdvisorMaterialItem::class);
    }

    /**
     * @return HasOne<AdvisorProfile, $this>
     */
    public function profile(): HasOne
    {
        return $this->hasOne(AdvisorProfile::class);
    }

    public function getAuthPasswordName(): string
    {
        return 'pin';
    }

    public function getRememberTokenName(): string
    {
        return '';
    }
}
