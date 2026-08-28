<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Advisor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaMessage extends Model
{
    public const DIRECTION_INBOUND = 'inbound';

    public const DIRECTION_OUTBOUND = 'outbound';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'conversation_id',
        'direction',
        'content_type',
        'body',
        'media_url',
        'external_id',
        'status',
        'sent_by_advisor_id',
        'automation_step_id',
        'meta',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(MetaConversation::class, 'conversation_id');
    }

    public function sentByAdvisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class, 'sent_by_advisor_id');
    }
}
