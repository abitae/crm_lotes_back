<?php

namespace App\Models\Inmopro;

use App\Models\GoogleAccount;
use App\Support\DateroRegistrationUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class Datero extends Model
{
    /**
     * @var list<string>
     */
    protected $hidden = [
        'pin',
        'invite_token',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'registration_url',
        'registration_qr_url',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'name',
        'phone',
        'email',
        'city_id',
        'dni',
        'username',
        'pin',
        'is_active',
        'last_login_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Datero $datero): void {
            if ($datero->invite_token === null || $datero->invite_token === '') {
                $datero->invite_token = (string) Str::uuid();
            }
        });
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function registrationUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => DateroRegistrationUrl::forDatero($this),
        );
    }

    /**
     * URL absoluta del PNG del QR (misma URL de registro codificada en imagen).
     *
     * @return Attribute<string|null, never>
     */
    protected function registrationQrUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->invite_token
                ? route('public.datero-registration.qr', ['token' => $this->invite_token], absolute: true)
                : null,
        );
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
     * @return BelongsTo<Advisor, $this>
     */
    public function assignedAdvisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class, 'advisor_id');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    /**
     * @return HasMany<DateroApiToken, $this>
     */
    public function apiTokens(): HasMany
    {
        return $this->hasMany(DateroApiToken::class);
    }

    /**
     * @return HasOne<GoogleAccount, $this>
     */
    public function googleAccount(): HasOne
    {
        return $this->hasOne(GoogleAccount::class);
    }

    /**
     * @return HasMany<Client, $this>
     */
    public function registeredClients(): HasMany
    {
        return $this->hasMany(Client::class, 'registered_by_datero_id');
    }
}
