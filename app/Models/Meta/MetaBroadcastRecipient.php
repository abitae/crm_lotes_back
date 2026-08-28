<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaBroadcastRecipient extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'broadcast_id',
        'client_id',
        'conversation_id',
        'phone',
        'status',
        'external_message_id',
        'error_message',
    ];

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(MetaBroadcast::class, 'broadcast_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(MetaConversation::class, 'conversation_id');
    }
}
