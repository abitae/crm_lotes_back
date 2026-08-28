<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Advisor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaAutomationFlow extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'cloned_from_flow_id',
        'name',
        'channels',
        'trigger_type',
        'trigger_config',
        'graph_json',
        'version',
        'is_published',
        'is_active',
        'is_corporate_template',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'trigger_config' => 'array',
            'graph_json' => 'array',
            'is_published' => 'boolean',
            'is_active' => 'boolean',
            'is_corporate_template' => 'boolean',
        ];
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(MetaAutomationStep::class, 'flow_id');
    }
}
