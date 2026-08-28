<?php

namespace App\Models\Meta;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaAutomationStep extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'flow_id',
        'node_id',
        'type',
        'config',
        'next_node_id',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'config' => 'array',
        ];
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(MetaAutomationFlow::class, 'flow_id');
    }
}
