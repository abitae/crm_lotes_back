<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Advisor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaBroadcast extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'meta_connection_id',
        'message_template_id',
        'name',
        'segment_config',
        'status',
        'scheduled_at',
        'sent_at',
        'total_recipients',
        'sent_count',
        'delivered_count',
        'read_count',
        'failed_count',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'segment_config' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    public function metaConnection(): BelongsTo
    {
        return $this->belongsTo(MetaConnection::class);
    }

    public function messageTemplate(): BelongsTo
    {
        return $this->belongsTo(MetaMessageTemplate::class, 'message_template_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(MetaBroadcastRecipient::class, 'broadcast_id');
    }
}
