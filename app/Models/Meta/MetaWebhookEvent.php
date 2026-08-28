<?php

namespace App\Models\Meta;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaWebhookEvent extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_hash',
        'meta_connection_id',
        'object_type',
        'payload',
        'processed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    public function metaConnection(): BelongsTo
    {
        return $this->belongsTo(MetaConnection::class);
    }
}
