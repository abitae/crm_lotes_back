<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MetaConversation extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_BOT = 'bot';

    public const STATUS_HUMAN = 'human';

    public const STATUS_CLOSED = 'closed';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'meta_connection_id',
        'advisor_id',
        'contact_identity_id',
        'client_id',
        'channel',
        'status',
        'bot_enabled',
        'has_client_conflict',
        'last_message_at',
        'last_inbound_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bot_enabled' => 'boolean',
            'has_client_conflict' => 'boolean',
            'last_message_at' => 'datetime',
            'last_inbound_at' => 'datetime',
        ];
    }

    public function metaConnection(): BelongsTo
    {
        return $this->belongsTo(MetaConnection::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    public function contactIdentity(): BelongsTo
    {
        return $this->belongsTo(MetaContactIdentity::class, 'contact_identity_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(MetaMessage::class, 'conversation_id');
    }

    public function automationSession(): HasOne
    {
        return $this->hasOne(MetaAutomationSession::class, 'conversation_id');
    }

    public function isWithinWhatsAppWindow(): bool
    {
        if ($this->channel !== 'whatsapp' || ! $this->last_inbound_at) {
            return true;
        }

        return $this->last_inbound_at->greaterThan(now()->subHours(24));
    }
}
