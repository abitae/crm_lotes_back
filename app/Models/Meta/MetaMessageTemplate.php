<?php

namespace App\Models\Meta;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaMessageTemplate extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'meta_connection_id',
        'template_name',
        'language',
        'status',
        'category',
        'components',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'components' => 'array',
        ];
    }

    public function metaConnection(): BelongsTo
    {
        return $this->belongsTo(MetaConnection::class);
    }
}
