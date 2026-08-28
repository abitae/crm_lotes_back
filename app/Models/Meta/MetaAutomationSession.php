<?php

namespace App\Models\Meta;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaAutomationSession extends Model
{
    public const STATUS_RUNNING = 'running';

    public const STATUS_WAITING = 'waiting';

    public const STATUS_HANDOFF = 'handoff';

    public const STATUS_COMPLETED = 'completed';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'conversation_id',
        'flow_id',
        'current_node_id',
        'status',
        'context',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(MetaConversation::class, 'conversation_id');
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(MetaAutomationFlow::class, 'flow_id');
    }
}
