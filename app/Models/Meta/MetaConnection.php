<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Advisor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class MetaConnection extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_ERROR = 'error';

    public const STATUS_DISCONNECTED = 'disconnected';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'status',
        'waba_id',
        'phone_number_id',
        'page_id',
        'ig_user_id',
        'access_token',
        'token_expires_at',
        'meta',
        'connected_at',
        'last_synced_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'token_expires_at' => 'datetime',
            'connected_at' => 'datetime',
            'last_synced_at' => 'datetime',
        ];
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(MetaConversation::class);
    }

    public function messageTemplates(): HasMany
    {
        return $this->hasMany(MetaMessageTemplate::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && filled($this->access_token);
    }

    public function hasWhatsApp(): bool
    {
        return filled($this->phone_number_id) && filled($this->waba_id);
    }

    public function hasMessenger(): bool
    {
        return filled($this->page_id);
    }

    public function hasInstagram(): bool
    {
        return filled($this->ig_user_id);
    }

    public function setAccessTokenAttribute(?string $value): void
    {
        $this->attributes['access_token'] = $value !== null && $value !== ''
            ? Crypt::encryptString($value)
            : null;
    }

    public function getDecryptedAccessToken(): ?string
    {
        if (blank($this->attributes['access_token'] ?? null)) {
            return null;
        }

        try {
            return Crypt::decryptString($this->attributes['access_token']);
        } catch (\Throwable) {
            return null;
        }
    }
}
